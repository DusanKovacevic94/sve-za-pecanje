import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "backend/scripts/backup_db.sh"
spec = importlib.util.spec_from_file_location("pg_command", SCRIPT.parents[2] / "ops/backup/pg_command.py")
pg_command = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pg_command)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="szp backup test ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        tools = self.root / "bin"
        tools.mkdir()
        commands = {
            "pg_dump": 'for arg do target="$arg"; done\nprintf dump > "$target"\nexit "${FAIL_DUMP:-0}"',
            "pg_restore": 'exit 0',
            "psql": 'echo "${ACTUAL_DB:-fishing_marketplace}"',
            "date": 'case "$*" in *%u*) echo 7;; *%s*) echo "${TEST_NOW:-123}";; *) echo "$TEST_STAMP";; esac',
            "rclone": 'exit "${FAIL_REMOTE:-0}"',
        }
        for name, body in commands.items():
            path = tools / name
            path.write_text("#!/bin/sh\n" + body + "\n")
            path.chmod(0o700)
        self.env = {"PATH": f"{tools}:/usr/bin:/bin", "BACKUP_ROOT": str(self.root / "dumps"),
                    "PG_BACKUP_HELPER": str(SCRIPT.parents[2] / "ops/backup/pg_command.py")}

    def run_backup(self, database="fishing_marketplace", day=1, **env):
        return subprocess.run(["sh", str(SCRIPT)], env={**self.env,
            "BACKUP_DATABASE": database, "TEST_STAMP": f"202601{day:02d}T000000Z", **env},
            capture_output=True, text=True)

    def test_independent_daily_weekly_retention_and_legacy_safety(self):
        legacy = self.root / "dumps/daily/legacy.dump"
        legacy.parent.mkdir(parents=True)
        legacy.write_text("preserve")
        for db in ["fishing_marketplace", "svezapecanje_cms"]:
            for day in range(1, 13):
                result = self.run_backup(db, day)
                self.assertEqual(result.returncode, 0, result.stderr)
        for db in ["fishing_marketplace", "svezapecanje_cms"]:
            self.assertEqual(len(list((self.root / f"dumps/{db}/daily").glob("*.dump"))), 7)
            self.assertEqual(len(list((self.root / f"dumps/{db}/weekly").glob("*.dump"))), 4)
        self.assertEqual(legacy.read_text(), "preserve")

    def test_failures_do_not_publish_partial_dump_or_success(self):
        self.assertNotEqual(self.run_backup(FAIL_DUMP="1").returncode, 0)
        self.assertEqual(list((self.root / "dumps").rglob("*.partial")), [])
        self.assertEqual(list((self.root / "dumps").rglob("*.dump")), [])
        self.assertNotEqual(self.run_backup(BACKUP_REMOTE="test:backup", FAIL_REMOTE="1").returncode, 0)
        self.assertEqual(list((self.root / "dumps").rglob("last-success")), [])

    def test_rejects_mismatched_url_and_unsafe_database_names(self):
        self.assertNotEqual(self.run_backup("svezapecanje_cms", DATABASE_URL="postgresql://test").returncode, 0)
        self.assertNotEqual(self.run_backup("../other").returncode, 0)

    def test_url_password_decoding_and_safe_libpq_environment(self):
        env = pg_command.connection_environment({"DATABASE_URL": "postgresql+psycopg://fishing_app:a%40b%3Ac%2Fd%25e@postgres/fishing_marketplace?sslmode=require", "BACKUP_DATABASE": "fishing_marketplace"})
        self.assertEqual(env["PGPASSWORD"], "a@b:c/d%e")
        self.assertEqual(env["PGDATABASE"], "fishing_marketplace")
        self.assertEqual(env["PGSSLMODE"], "require")
        self.assertNotIn("DATABASE_URL", env)
        with self.assertRaises(ValueError):
            pg_command.connection_environment({"DATABASE_URL": "postgresql://u:p@postgres/other", "BACKUP_DATABASE": "fishing_marketplace"})

    def test_backup_health_requires_recent_success_for_each_database(self):
        health = SCRIPT.parents[2] / "ops/backup/check_backup.sh"
        def check(**env):
            return subprocess.run(["sh", str(health)], env={**self.env, **env},
                                  capture_output=True, text=True).returncode
        self.assertNotEqual(check(), 0)
        self.assertEqual(self.run_backup().returncode, 0)
        self.assertEqual(check(TEST_NOW="124"), 0)
        self.assertNotEqual(check(BACKUP_DATABASE="svezapecanje_cms"), 0)
        self.assertNotEqual(check(TEST_NOW="173223"), 0)
        self.assertNotEqual(check(TEST_NOW="122"), 0)
        self.assertNotEqual(check(BACKUP_INTERVAL_SECONDS="invalid"), 0)


if __name__ == "__main__":
    unittest.main()
