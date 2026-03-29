from django.urls import path
from .views import CVView

urlpatterns = [
    path('', CVView.as_view(), name='cv'),
]
