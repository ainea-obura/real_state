from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from accounts.models import Users
from rest_framework import status

# Create your tests here.

class TenantOwnerAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Users.objects.create_superuser(email='admin@example.com', password='adminpass')
        self.client.force_authenticate(user=self.admin)

    def test_create_tenant(self):
        url = reverse('tenant-list')
        data = {
            'email': 'tenant1@example.com',
            'first_name': 'Tenant',
            'last_name': 'One',
            'phone': '1234567890',
            'gender': 'Male',
            'is_active': True,
            'address': '123 Main St',
            'postal_code': '12345',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['isError'], False)
        self.assertEqual(response.data['data']['type'], 'tenant')

    def test_create_owner(self):
        url = reverse('owner-list')
        data = {
            'email': 'owner1@example.com',
            'first_name': 'Owner',
            'last_name': 'One',
            'phone': '0987654321',
            'gender': 'Female',
            'is_active': True,
            'address': '456 Main St',
            'postal_code': '54321',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['isError'], False)
        self.assertEqual(response.data['data']['type'], 'owner')

    def test_list_tenants(self):
        Users.objects.create(email='tenant2@example.com', type='tenant', is_active=True)
        url = reverse('tenant-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['isError'], False)

    def test_list_owners(self):
        Users.objects.create(email='owner2@example.com', type='owner', is_active=True)
        url = reverse('owner-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['isError'], False)
