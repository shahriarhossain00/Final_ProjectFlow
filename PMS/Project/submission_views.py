from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated

from .models import TaskSubmission
from .serializers import TaskSubmissionSerializer


class SecureTaskSubmissionListView(generics.ListCreateAPIView):
    serializer_class = TaskSubmissionSerializer
    permission_classes = [IsAuthenticated]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = TaskSubmission.objects.select_related(
            "task",
            "task__project",
            "submitted_by",
        )

        # Superusers can view all submissions.
        if user.is_superuser:
            return queryset

        role = getattr(
            getattr(user, "profile", None),
            "role",
            None,
        )

        # Managers can view submissions for their projects.
        if role == "Manager":
            return queryset.filter(
                task__project__manager=user
            )

        # Employees can only view their own submissions.
        return queryset.filter(
            submitted_by=user
        )

    def perform_create(self, serializer):
        user = self.request.user
        task = serializer.validated_data["task"]

        # Only the currently assigned employee can submit work.
        if task.assigned_to_id != user.id:
            raise PermissionDenied(
                "You are not assigned to this task."
            )

        serializer.save(
            task=task,
            submitted_by=user,
        )