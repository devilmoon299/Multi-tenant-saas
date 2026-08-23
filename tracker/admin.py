from django.contrib import admin
from .models import Organization, Membership, Project, Task, Workspace

# Register your models here so they show up in the admin dashboard
admin.site.register(Organization)
admin.site.register(Membership)
admin.site.register(Project)
admin.site.register(Task)
admin.site.register(Workspace)