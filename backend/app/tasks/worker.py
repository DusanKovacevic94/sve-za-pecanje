import time


def main() -> None:
    print("Worker started. Background jobs are intentionally minimal for MVP.")
    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()

