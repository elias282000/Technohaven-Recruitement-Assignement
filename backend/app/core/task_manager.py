import asyncio
import logging

logger = logging.getLogger(__name__)


class TaskManager:
    """Track one local background task per service request."""

    def __init__(self) -> None:
        self._tasks: dict[int, asyncio.Task[None]] = {}

    def schedule(self, request_id: int) -> bool:
        """
        Schedule processing unless an active local task already exists.

        Returns True when a task is created and False when the request
        is already scheduled in the current process.
        """

        existing_task = self._tasks.get(request_id)

        if existing_task is not None and not existing_task.done():
            return False

        # Runtime import avoids a circular import between the task
        # manager, background processor, and request service.
        from app.core.background_processing import process_request

        task = asyncio.create_task(
            process_request(request_id),
            name=f"process-service-request-{request_id}",
        )

        self._tasks[request_id] = task

        task.add_done_callback(
            lambda completed_task: self._remove_task(
                request_id=request_id,
                completed_task=completed_task,
            )
        )

        logger.info(
            "Scheduled background processing for request %s.",
            request_id,
        )

        return True

    def _remove_task(
        self,
        request_id: int,
        completed_task: asyncio.Task[None],
    ) -> None:
        """Remove a completed task without deleting a newer replacement."""

        registered_task = self._tasks.get(request_id)

        if registered_task is completed_task:
            self._tasks.pop(request_id, None)

        if completed_task.cancelled():
            logger.info(
                "Background task for request %s was cancelled.",
                request_id,
            )
            return

        exception = completed_task.exception()

        if exception is not None:
            logger.error(
                "Background task for request %s failed.",
                request_id,
                exc_info=(
                    type(exception),
                    exception,
                    exception.__traceback__,
                ),
            )

    def is_scheduled(self, request_id: int) -> bool:
        """Return whether a non-finished local task is registered."""

        task = self._tasks.get(request_id)

        return task is not None and not task.done()

    def active_request_ids(self) -> set[int]:
        """Return IDs that currently have active local tasks."""

        return {
            request_id
            for request_id, task in self._tasks.items()
            if not task.done()
        }

    @property
    def active_count(self) -> int:
        """Return the number of active registered tasks."""

        return len(self.active_request_ids())

    async def cancel_all(self) -> None:
        """Cancel and await all local tasks during shutdown."""

        tasks = list(self._tasks.values())

        for task in tasks:
            if not task.done():
                task.cancel()

        if tasks:
            await asyncio.gather(
                *tasks,
                return_exceptions=True,
            )

        self._tasks.clear()


task_manager = TaskManager()