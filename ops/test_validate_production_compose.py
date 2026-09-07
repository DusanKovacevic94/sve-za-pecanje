import copy
import unittest

from validate_production_compose import load_config, validate


class ProductionComposeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_config()

    def test_safe_config(self):
        self.assertEqual(validate(self.config), [])

    def test_rejects_cms_regressions(self):
        mutations = [
            ("user", "root"), ("ports", [{"published": "3002"}]),
            ("volumes", [{"type": "bind"}]), ("read_only", False),
            ("healthcheck", {}), ("build", {"target": "tools"}),
            ("cap_drop", []), ("security_opt", []),
        ]
        for key, value in mutations:
            config = copy.deepcopy(self.config)
            config["services"]["cms"][key] = value
            with self.subTest(key=key):
                self.assertTrue(validate(config))

    def test_rejects_secret_routing_and_backup_regressions(self):
        for key, value in [("CMS_BUILD", "true"), ("CMS_PROVISION_PASSWORD", "secret"),
                           ("CMS_ENV", "test"), ("CMS_PUBLIC_URL", "http://localhost:3002"),
                           ("CMS_REVALIDATE_URL", "http://backend:8000/api/blog/revalidate")]:
            config = copy.deepcopy(self.config)
            config["services"]["cms"]["environment"][key] = value
            self.assertTrue(validate(config), key)
        config = copy.deepcopy(self.config)
        del config["services"]["cms-backup"]
        self.assertTrue(validate(config))

    def test_rejects_backup_and_network_regressions(self):
        for service, key, value in [
            ("cms-backup", "healthcheck", {}), ("backup", "build", {}),
            ("frontend", "networks", {"default": {}}),
            ("cms-backup", "environment", {"PGUSER": "postgres"}),
        ]:
            config = copy.deepcopy(self.config)
            config["services"][service][key] = value
            self.assertTrue(validate(config), (service, key))


if __name__ == "__main__":
    unittest.main()
