from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, Workspace, Project, Comment


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        # Exposes all task fields the frontend needs
        fields = ['id', 'title', 'description', 'status', 'due_date', 'assigned_to', 'project']


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name', 'members', 'created_at', 'is_pro']
        read_only_fields = ['members']


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


# NEW: Exposes org members for "Assign To" dropdowns and team management panels
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        # Passwords are never exposed — only safe read-only identity fields


# NEW: Comment serializer — author is set automatically by the view (not by the client)
class CommentSerializer(serializers.ModelSerializer):
    # Read-only: returns the author's username as a string for display
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'task', 'author', 'author_username', 'content', 'created_at']
        # 'author' is write-only (set by perform_create in the view)
        # 'author_username' is the display-friendly read version
        extra_kwargs = {
            'author': {'read_only': True},
        }