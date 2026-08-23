from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .serializers import TaskSerializer
from rest_framework.permissions import IsAuthenticated
import stripe
from django.conf import settings
from django.urls import reverse
from .forms import TaskForm, ProjectForm, CommentForm
from django.db import transaction
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.shortcuts import render, redirect
from .models import Task, Organization, Membership, Project, Workspace
from django.contrib.auth.decorators import login_required
from .forms import ProjectForm, TaskForm, RegisterForm, InviteMemberForm, CommentForm
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from .models import Workspace
from .serializers import WorkspaceSerializer, ProjectSerializer
from django.http import HttpResponse
import json
from rest_framework import viewsets, permissions

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

@login_required
def task_board(request):
    # 1. Identify which organization(s) this user belongs to
    user_memberships = Membership.objects.filter(user=request.user)
    user_org_ids = user_memberships.values_list('organization_id', flat=True)
    
    # 2. The Firewall: Only fetch data for their organizations
    projects = Project.objects.filter(organization_id__in=user_org_ids)
    tasks = Task.objects.filter(project__in=projects)
    
    # 3. NEW: Calculate Dashboard Analytics
    total_projects = projects.count()
    total_tasks = tasks.count()
    todo_count = tasks.filter(status='TODO').count()
    progress_count = tasks.filter(status='IN_PROGRESS').count()
    done_count = tasks.filter(status='DONE').count()
    
    return render(request, 'tracker/task_board.html', {
        'projects': projects,
        'tasks': tasks,
        'active_memberships': user_memberships,
        
        # Pass the calculated stats to the template
        'total_projects': total_projects,
        'total_tasks': total_tasks,
        'todo_count': todo_count,
        'progress_count': progress_count,
        'done_count': done_count,
    })

@login_required
def create_project(request):
    # Step 1: Look up the user's organization
    user_membership = Membership.objects.get(user=request.user)
    current_org = user_membership.organization

    if request.method == 'POST':
        # The user clicked submit. Bind the incoming data to our form.
        form = ProjectForm(request.POST)
        if form.is_valid():
            # INTERVIEW GOLD MINE: commit=False
            # This creates the Python object in memory but PAUSES before hitting PostgreSQL.
            project = form.save(commit=False)
            
            # Now we securely attach the organization behind the scenes
            project.organization = current_org
            
            # Finally, execute the SQL insert
            project.save()
            return redirect('task_board') # The Redirect in the PRG pattern!
    else:
        # The user just clicked the link to visit the page. Show them a blank form (GET request).
        form = ProjectForm()

    return render(request, 'tracker/create_task.html', {
        'form': form,
        'page_title': 'Create New Project',
        'button_text': 'Save Project'
    })

def register_workspace(request):
    if request.method == 'POST':
        # Capture the standard user data (username, passwords)
        form = UserCreationForm(request.POST)
        # Capture our custom workspace name from the HTML input
        workspace_name = request.POST.get('workspace_name')
        
        if form.is_valid() and workspace_name:
            # The Atomic block ensures all 3 steps succeed, or none of them do
            with transaction.atomic():
                # 1. Create the User account
                user = form.save()
                
                # 2. Create the Organization
                org = Organization.objects.create(name=workspace_name)
                
                # 3. Create the Membership (linking the user to the organization)
                Membership.objects.create(user=user, organization=org, role='ADMIN')
                
                # Log the new user in automatically
                login(request, user)
                
                # Send them straight to their new, empty dashboard
                return redirect('task_board')
    else:
        form = UserCreationForm()
        
    return render(request, 'tracker/register.html', {'form': form})

@login_required
def create_task(request):
    # 1. Look up the user's current organization
    user_membership = Membership.objects.get(user=request.user)
    current_org = user_membership.organization

    if request.method == 'POST':
        # 2. Pass the organization into the form so it can secure the dropdown
        form = TaskForm(request.POST, organization=current_org)
        if form.is_valid():
            form.save()
            return redirect('task_board')
    else:
        # 3. Pass it here too, so the blank form is secure when the page loads
        form = TaskForm(organization=current_org)
        
    return render(request, 'tracker/create_task.html', {
        'form': form,
        'page_title': 'Create New Task',
        'button_text': 'Save Task'
    })

@login_required
def update_task_status(request, task_id, new_status):
    # 1. Fetch the exact task using the ID
    task = get_object_or_404(Task, id=task_id)
    
    # Security Check: Ensure the user's organization matches the task's organization!
    user_membership = Membership.objects.get(user=request.user)
    if task.project.organization == user_membership.organization:
        # 2. Update the status and save directly to PostgreSQL
        task.status = new_status
        task.save()
        
    # 3. Bounce them seamlessly back to the dashboard
    return redirect('task_board')

@login_required
def edit_task(request, task_id):
    # Fetch the exact task
    task = get_object_or_404(Task, id=task_id)

    comments = task.comments.all().order_by('-created_at')
    
    if request.method == 'POST':
        if 'comment_submit' in request.POST:
            comment_form = CommentForm(request.POST)
            if comment_form.is_valid():
                comment = comment_form.save(commit=False)
                comment.task = task
                comment.author = request.user
                comment.save()
                return redirect('edit_task', task_id=task.id)
        else:
        # Pre-fill the form with the existing task's data
         form = TaskForm(instance=task)
         if form.is_valid():
                form.save()
                return redirect('task_board')

    else:
        form = TaskForm(instance=task)
        
    # Always generate a blank comment form to load on the page
    comment_form = CommentForm()


        
    # We recycle your existing template!
    return render(request, 'tracker/create_task.html', {
        'form': form,
        'comment_form': comment_form, # <-- Pass the comment form
        'comments': comments,         # <-- Pass the existing comments
        'page_title': 'Edit Task',
        'button_text': 'Update Task'
    })
@login_required
def delete_task(request, task_id):
    # Fetch the exact task
    task = get_object_or_404(Task, id=task_id)
    
    # Delete it from the PostgreSQL database
    task.delete()
    
    # Bounce back to the dashboard
    return redirect('task_board')


def signup(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            # 1. Save the new user
            user = form.save()
            
            # 2. Create their isolated tenant
            org_name = form.cleaned_data.get('organization_name')
            org = Organization.objects.create(name=org_name) 
            
            # 3. Link the user to the tenant as an Admin
            Membership.objects.create(user=user, organization=org, role='ADMIN')
            
            # 4. Log them in automatically
            login(request, user)
            return redirect('task_board')
    else:
        form = RegisterForm()

    return render(request, 'tracker/create_task.html', {
        'form': form,
        'page_title': 'Create an Account',
        'button_text': 'Sign Up'
    })

@login_required
def invite_member(request):
    # 1. Security Check: Find the workspace where the current user is an Admin
    admin_membership = Membership.objects.filter(user=request.user, role='Admin').first()
    
    # If they aren't an admin anywhere, kick them back to the dashboard
    if not admin_membership:
        return redirect('task_board')
        
    if request.method == 'POST':
        form = InviteMemberForm(request.POST)
        if form.is_valid():
            target_username = form.cleaned_data.get('username')
            assigned_role = form.cleaned_data.get('role')
            
            try:
                # 2. Look for the user in the database
                target_user = User.objects.get(username=target_username)
                
                # 3. Create the multi-tenant link
                Membership.objects.get_or_create(
                    user=target_user,
                    organization=admin_membership.organization,
                    defaults={'role': assigned_role}
                )
                return redirect('task_board')
                
            except User.DoesNotExist:
                # If the user typed a typo, throw a clean error
                form.add_error('username', 'This user does not exist in the system yet.')
    else:
        form = InviteMemberForm()
        
    # 4. Recycle our dynamic template!
    return render(request, 'tracker/create_task.html', {
        'form': form,
        'page_title': f'Invite to {admin_membership.organization.name}',
        'button_text': 'Send Invite'
    })

stripe.api_key = settings.STRIPE_SECRET_KEY

@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    
    try:
        event_data = json.loads(payload)
        event = stripe.Event.construct_from(event_data, stripe.api_key)
    except Exception as e:
        print(f"❌ WEBHOOK PAYLOAD ERROR: {e}")
        return HttpResponse(status=400)

    if event['type'] == 'checkout.session.completed':
        session_dict = event_data['data']['object']
        
        # THE FIX: Use dot notation (.metadata) instead of .get('metadata')
        workspace_id = session_dict.get('metadata', {}).get('workspace_id')

        if workspace_id:
            try:
                workspace = Workspace.objects.get(id=workspace_id)
                workspace.is_pro = True
                workspace.save()
                print(f"✅ WEBHOOK SUCCESS: {workspace.name} has been upgraded to PRO")
            except Workspace.DoesNotExist:
                print("❌ WEBHOOK ERROR: Workspace not found.")

    return HttpResponse(status=200)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_task_list(request):
    membership = Membership.objects.filter(user=request.user).first()
    
    if not membership:
        return Response({"error": "You do not belong to an organization."}, status=403)
        
    if request.method == 'GET':
        tasks = Task.objects.filter(project__organization=membership.organization)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            project = serializer.validated_data.get('project')
            if project.organization != membership.organization:
                return Response({"error": "You do not have permission to add tasks to this project."}, status=403)
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400) 

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_task_detail(request, pk):
    membership = Membership.objects.filter(user=request.user).first()
    if not membership:
        return Response({"error": "You do not belong to an organization."}, status=403)
        
    try:
        task = Task.objects.get(pk=pk, project__organization=membership.organization)
    except Task.DoesNotExist:
        return Response({"error": "Task not found or access denied."}, status=404)

    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)
        
    elif request.method == 'PUT':
        serializer = TaskSerializer(task, data=request.data)
        if serializer.is_valid():
            project = serializer.validated_data.get('project', task.project)
            if project.organization != membership.organization:
                return Response({"error": "You do not have permission to move tasks to this project."}, status=403)
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
        
    elif request.method == 'DELETE':
        task.delete()
        return Response(status=204)

class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # SECURITY: Users can only see workspaces they are a member of
        return self.request.user.workspaces.all()

    def perform_create(self, serializer):
        # When a user creates a new workspace, automatically add them as a member
        workspace = serializer.save()
        workspace.members.add(self.request.user)

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Enforce Isolation: Only return projects for the active workspace
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            return Project.objects.filter(workspace_id=workspace_id, workspace__members=self.request.user)
        
        # Fallback: Show projects from any workspace the user belongs to
        return Project.objects.filter(workspace__members=self.request.user)

stripe.api_key = settings.STRIPE_SECRET_KEY

class CreateCheckoutSessionView(APIView):
    def post(self, request, *args, **kwargs):
        # 1. Grab the workspace ID sent from Next.js
        workspace_id = request.data.get('workspace_id') 

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': 'usd',
                            'unit_amount': 2000,
                            'product_data': {
                                'name': 'Pro Tier Upgrade',
                                'description': 'Upgrade your workspace to the Pro Tier.',
                            },
                        },
                        'quantity': 1,
                    },
                ],
                mode='payment',
                # 2. Attach the workspace ID so Stripe can send it back later!
                metadata={'workspace_id': workspace_id}, 
                success_url='http://localhost:3000/?success=true',
                cancel_url='http://localhost:3000/?canceled=true',
            )
            return Response({'checkout_url': checkout_session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# -----------------------------------------------------------------------
# NEW API VIEW 1: User Registration
# Endpoint: POST /api/register/
# Creates a new User + Organization + ADMIN Membership atomically.
# -----------------------------------------------------------------------
from .serializers import CommentSerializer, UserSerializer
from rest_framework import generics

class RegisterView(APIView):
    """
    Public endpoint — no authentication required.
    Body: { "username": "...", "password": "...", "organization_name": "..." }
    """
    permission_classes = []  # Allow any (unauthenticated) access

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        organization_name = request.data.get('organization_name', '').strip()

        # Validate required fields
        if not username or not password:
            return Response(
                {'error': 'username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'A user with that username already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 1. Create user
            user = User.objects.create_user(username=username, password=password)

            # 2. Create org (use username as fallback org name if not supplied)
            org_name = organization_name if organization_name else f"{username}'s Workspace"
            org = Organization.objects.create(name=org_name)

            # 3. Link user → org as ADMIN
            Membership.objects.create(user=user, organization=org, role='ADMIN')

        return Response(
            {'message': 'Registration successful. You can now log in.'},
            status=status.HTTP_201_CREATED
        )


# -----------------------------------------------------------------------
# NEW API VIEW 2: List users in the caller's organization
# Endpoint: GET /api/users/
# Used by the frontend to populate "Assign To" and team member dropdowns.
# -----------------------------------------------------------------------
class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Security: only return users that share an org with the caller
        membership = Membership.objects.filter(user=self.request.user).first()
        if not membership:
            return User.objects.none()
        org_user_ids = Membership.objects.filter(
            organization=membership.organization
        ).values_list('user_id', flat=True)
        return User.objects.filter(id__in=org_user_ids)


# -----------------------------------------------------------------------
# NEW API VIEW 3: Comments ViewSet
# Endpoints: GET /api/comments/?task=<id>   POST /api/comments/
# -----------------------------------------------------------------------
class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        # Scope to tasks that belong to the caller's organization
        membership = Membership.objects.filter(user=self.request.user).first()
        if not membership:
            from .models import Comment
            return Comment.objects.none()

        from .models import Comment
        qs = Comment.objects.filter(
            task__project__organization=membership.organization
        ).select_related('author', 'task').order_by('-created_at')

        # Optional ?task=<id> filter used by the frontend
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        # Automatically set the author to the logged-in user
        serializer.save(author=self.request.user)