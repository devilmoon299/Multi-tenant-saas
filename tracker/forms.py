from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Task, Project, Membership, Comment
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm


class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        # We only want the user to type the name and description. 
        # We will handle the organization behind the scenes!
        fields = ['name', 'description']

class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['title', 'description', 'project', 'status', 'assigned_to', 'due_date']
        
        # Force the due_date field to render as a sleek HTML5 calendar picker
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date'})
        }

    def __init__(self, *args, **kwargs):
        organization = kwargs.pop('organization', None)
        super().__init__(*args, **kwargs)
        
        if organization:
            # Secure the Project dropdown
            self.fields['project'].queryset = Project.objects.filter(organization=organization)
            
            # 2. Secure the User dropdown (Find users belonging to this specific organization)
            org_memberships = Membership.objects.filter(organization=organization)
            user_ids = org_memberships.values_list('user', flat=True)
            self.fields['assigned_to'].queryset = User.objects.filter(id__in=user_ids)

@login_required
def create_project(request):
    if request.method == 'POST':
        form = ProjectForm(request.POST)
        if form.is_valid():
            # commit=False pauses the save so we can inject the organization data securely
            project = form.save(commit=False)
            user_membership = Membership.objects.get(user=request.user)
            project.organization = user_membership.organization
            project.save()
            return redirect('task_board')
    else:
        form = ProjectForm()
        
    # We recycle your existing form template, passing a custom title!
    return render(request, 'tracker/task_form.html', {
        'form': form, 
        'page_title': 'Create New Project'
    })

class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['content']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Type your comment here...'})
        }

class RegisterForm(UserCreationForm):
    # We add a custom field so they can create their tenant immediately
    organization_name = forms.CharField(
        max_length=100, 
        required=True,
        help_text="Name your new workspace or organization."
    )

# Add this at the bottom of forms.py
class InviteMemberForm(forms.Form):
    username = forms.CharField(
        max_length=150, 
        help_text="Enter the exact username of the person you want to invite."
    )
    role_choices = [
        ('ADMIN', 'Admin'),    # uppercase keys match Membership.ROLE_CHOICES
        ('MEMBER', 'Member'),
    ]
    role = forms.ChoiceField(choices=role_choices)