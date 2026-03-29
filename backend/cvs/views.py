from rest_framework import generics, permissions, parsers
from .models import CV
from .serializers import CVSerializer


class CVView(generics.RetrieveUpdateAPIView):
    serializer_class = CVSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Accept multipart so file/image uploads work
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self):
        cv, _ = CV.objects.get_or_create(
            user=self.request.user,
            defaults={
                'full_name': self.request.user.get_full_name() or self.request.user.username,
                'email': self.request.user.email,
                'phone': getattr(self.request.user, 'phone', ''),
            }
        )
        return cv

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
