FROM postgres:16-alpine
RUN apk add --no-cache rclone python3
COPY backend/scripts/backup_db.sh /scripts/backup_db.sh
COPY ops/backup/check_backup.sh /scripts/check_backup.sh
COPY ops/backup/pg_command.py /scripts/pg_command.py
ENTRYPOINT ["/bin/sh"]
