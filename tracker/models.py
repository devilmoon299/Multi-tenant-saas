from django.db import models
from django.contrib.auth.models import User

# 1. The Tenant (Organization)
class Organization(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    
    def __str__(self):
        return self.name

# 2. Roles and Permissions
class Membership(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('MEMBER', 'Member'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='MEMBER')

    class Meta:
        unique_together = ('user', 'organization')

class Workspace(models.Model):
    name = models.CharField(max_length=255)
    # ManyToMany means a user can be in multiple workspaces, and a workspace can have multiple users
    members = models.ManyToManyField(User, related_name='workspaces')
    created_at = models.DateTimeField(auto_now_add=True)
    is_pro = models.BooleanField(default=False)

    def __str__(self):
        return self.name

# 3. The Project 
class Project(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='projects', null=True)
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"

# 4. The Task 
class Task(models.Model):
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done'),
    ]

    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TODO')
    assigned_to = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.title

class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username} on {self.task.title}"