import uvicorn
from job_agent.config import settings


def main() -> None:
    uvicorn.run(
        "job_agent.api.server:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=False,
    )


if __name__ == "__main__":
    main()

