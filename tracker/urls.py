from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet,
    WorkspaceViewSet,
    CommentViewSet,
    CreateCheckoutSessionView,
    RegisterView,
    UserListView,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'comments', CommentViewSet, basename='comment')   # NEW

urlpatterns = [
    # ---- Template / HTML views ----
    path('board/', views.task_board, name='task_board'),
    path('register/', views.register_workspace, name='register'),
    path('project/new/', views.create_project, name='create_project'),
    path('task/new/', views.create_task, name='create_task'),
    path('task/<int:task_id>/update/<str:new_status>/', views.update_task_status, name='update_status'),
    path('task/<int:task_id>/edit/', views.edit_task, name='edit_task'),
    path('task/<int:task_id>/delete/', views.delete_task, name='delete_task'),
    path('signup/', views.signup, name='signup'),
    path('invite/', views.invite_member, name='invite_member'),

    # ---- Stripe ----
    path('upgrade/', CreateCheckoutSessionView.as_view(), name='upgrade_pro'),
    path('webhook/', views.stripe_webhook, name='stripe_webhook'),

    # ---- DRF API: Tasks (explicit endpoints) ----
    path('api/tasks/', views.api_task_list, name='api_task_list'),
    path('api/tasks/<int:pk>/', views.api_task_detail, name='api_task_detail'),

    # ---- DRF API: Auth ----
    path('api/register/', RegisterView.as_view(), name='api_register'),       # NEW — POST signup

    # ---- DRF API: Users (org-scoped) ----
    path('api/users/', UserListView.as_view(), name='api_users'),             # NEW — GET team list

    # ---- DRF API: Stripe checkout ----
    path('api/create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),

    # ---- DRF Router (projects, workspaces, comments) ----
    path('api/', include(router.urls)),
]