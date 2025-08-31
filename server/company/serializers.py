from rest_framework import serializers
from accounts.models import City, Users
from .models import Company, Branch, Owner, BusinessOnboarding


class BranchMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for branches, returning only id and name.
    Used for dropdowns and simple lists.
    """

    class Meta:
        model = Branch
        fields = ["id", "name"]
        read_only_fields = ["id", "name"]


class CompanyMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for companies, returning only id and name.
    Used for dropdowns and simple lists.
    """

    class Meta:
        model = Company
        fields = ["id", "name"]
        read_only_fields = ["id", "name"]


class CompanyCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new company with validation.
    """

    user_email = serializers.EmailField(write_only=True)
    postalCode = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, source="postal_code"
    )

    class Meta:
        model = Company
        fields = [
            "name",
            "phone",
            "email",
            "website",
            "address",
            "city",
            "postalCode",
            "logo",
            "user_email",
        ]

    def validate_email(self, value):
        if Company.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A company with this email already exists"
            )
        return value

    def validate_logo(self, value):
        if not value:
            return value

        if value.size > 5 * 1024 * 1024:  # 5MB
            raise serializers.ValidationError("Logo file size must be less than 5MB")

        allowed_types = ["image/jpeg", "image/jpg", "image/png"]
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Logo must be a JPEG or PNG file")

        return value

    def validate_user_email(self, value):
        try:
            user = Users.objects.get(email=value)
            if not user.is_active:
                raise serializers.ValidationError("User account is not active")
            if Owner.objects.filter(user=user).exists():
                raise serializers.ValidationError("User already owns a company")
            return value
        except Users.DoesNotExist:
            raise serializers.ValidationError("Invalid user email")

    def create(self, validated_data):
        # Remove user_email from the data as it's not a Company model field
        validated_data.pop("user_email", None)

        # Create the company with the remaining fields
        company = super().create(validated_data)

        return company


class BranchCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a branch, including the main branch.
    """

    class Meta:
        model = Branch
        fields = [
            "name",
            "email",
            "address",
            "city",
            "postal_code",
        ]

    def validate_email(self, value):
        company = self.context.get("company")
        if not company:
            raise serializers.ValidationError("Company context is required")

        if Branch.objects.filter(company=company, email=value).exists():
            raise serializers.ValidationError("A branch with this email already exists")
        return value


class CompanyDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving company details with its branches.
    """

    city_name = serializers.CharField(source="city.name", read_only=True)
    city = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "website",
            "status",
            "address",
            "city",
            "city_name",
            "country",
            "postal_code",
            "logo",
            "created_at",
            "updated_at",
            "user",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_city(self, obj):
        if obj.city:
            return {"id": str(obj.city.id), "name": obj.city.name}
        return None

    def get_country(self, obj):
        if obj.city and obj.city.country:
            return {"id": str(obj.city.country.id), "name": obj.city.country.name}
        return None

    def get_user(self, obj):
        """Get the current authenticated user"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return {
                "id": str(request.user.id),
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "phone": request.user.phone,
                "email": request.user.email,
            }
        return None


class CompanyUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating company details.
    """

    # User fields for updating user information
    user_first_name = serializers.CharField(required=False, allow_blank=True)
    user_last_name = serializers.CharField(required=False, allow_blank=True)
    user_phone = serializers.CharField(required=False, allow_blank=True)
    user_email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = Company
        fields = [
            "name",
            "phone",
            "email",
            "website",
            "address",
            "city",
            "postal_code",
            "logo",
            "user_first_name",
            "user_last_name",
            "user_phone",
            "user_email",
        ]

    def validate_email(self, value):
        # Check if email is already taken by another company
        company_id = self.instance.id if self.instance else None
        if Company.objects.filter(email=value).exclude(id=company_id).exists():
            raise serializers.ValidationError(
                "A company with this email already exists"
            )
        return value

    def validate_logo(self, value):
        if not value:
            return value

        if value.size > 5 * 1024 * 1024:  # 5MB
            raise serializers.ValidationError("Logo file size must be less than 5MB")

        allowed_types = ["image/jpeg", "image/jpg", "image/png"]
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Logo must be a JPEG or PNG file")

        return value

    def update(self, instance, validated_data):
        # Extract user fields before updating company
        user_first_name = validated_data.pop("user_first_name", None)
        user_last_name = validated_data.pop("user_last_name", None)
        user_phone = validated_data.pop("user_phone", None)
        user_email = validated_data.pop("user_email", None)

        # Update company data
        company = super().update(instance, validated_data)

        # Update user data if provided
        if any([user_first_name, user_last_name, user_phone, user_email]):
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                user = request.user

                if user_first_name is not None:
                    user.first_name = user_first_name
                if user_last_name is not None:
                    user.last_name = user_last_name
                if user_phone is not None:
                    user.phone = user_phone
                if user_email is not None:
                    user.email = user_email

                user.save()

        return company


class BranchListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing branch details.
    """

    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "email",
            "address",
            "city",
            "city_name",
            "postal_code",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DirectorSerializer(serializers.Serializer):
    """
    Serializer for director information in business onboarding.
    """

    directorName = serializers.CharField(max_length=255)
    directorIdnumber = serializers.CharField(max_length=50)
    directorMobileNumber = serializers.CharField(max_length=20)
    directorKraPin = serializers.CharField(max_length=50)
    directorDocumentType = serializers.CharField(max_length=100)
    directorCountryCode = serializers.CharField(max_length=10)


class BusinessOnboardingSerializer(serializers.ModelSerializer):
    """
    Serializer for business onboarding data with database storage.
    """

    # Directors field as nested serializer for validation
    directors = DirectorSerializer(many=True)

    class Meta:
        model = BusinessOnboarding
        fields = [
            # API Response fields
            "status",
            "responseCode",
            "message",
            # Business Account Information
            "requestId",
            "merchantCode",
            "accountNumber",
            "displayName",
            "accountStatus",
            "accountBalance",
            "otp",
            # Basic Information
            "businessName",
            "billNumber",
            "description",
            # Business Details
            "productType",
            "countryId",
            "subregionId",
            "industryId",
            "subIndustryId",
            # Banking Information
            "bankId",
            "bankAccountNumber",
            # Contact Information
            "mobileNumber",
            "businessTypeId",
            "email",
            # Registration Information
            "registrationNumber",
            "kraPin",
            "referralCode",
            "dealerNumber",
            # Business Details
            "purpose",
            "natureOfBusiness",
            "physicalAddress",
            # Transaction Estimates
            "estimatedMonthlyTransactionAmount",
            "estimatedMonthlyTransactionCount",
            # Callback URL
            "callbackUrl",
            # Directors
            "directors",
        ]
        read_only_fields = [
            "id",
            "status",
            "responseCode",
            "message",
            "requestId",
            "merchantCode",
            "accountNumber",
            "displayName",
            "accountStatus",
            "accountBalance",
            "otp",
            "created_at",
            "updated_at",
        ]

    def validate_merchantCode(self, value):
        """Validate merchant code is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Merchant code is required")
        return value

    def validate_businessName(self, value):
        """Validate business name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Business name is required")
        return value

    def validate_description(self, value):
        """Validate description is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Description is required")
        return value

    def validate_productType(self, value):
        """Validate product type is not empty"""
        if not value:
            raise serializers.ValidationError("Product type is required")
        return value

    def validate_countryId(self, value):
        """Validate country ID is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Country is required")
        return value

    def validate_subregionId(self, value):
        """Validate subregion ID is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Subregion is required")
        return value

    def validate_industryId(self, value):
        """Validate industry ID is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Industry is required")
        return value

    def validate_subIndustryId(self, value):
        """Validate sub industry ID is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Sub industry is required")
        return value

    def validate_bankId(self, value):
        """Validate bank ID is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Bank is required")
        return value

    def validate_bankAccountNumber(self, value):
        """Validate bank account number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Bank account number is required")
        return value

    def validate_mobileNumber(self, value):
        """Validate mobile number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Mobile number is required")
        return value

    def validate_businessTypeId(self, value):
        """Validate business type ID is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Business type is required")
        return value

    def validate_email(self, value):
        """Validate email is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Email is required")
        return value

    def validate_registrationNumber(self, value):
        """Validate registration number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Registration number is required")
        return value

    def validate_kraPin(self, value):
        """Validate KRA PIN is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("KRA PIN is required")
        return value

    def validate_referralCode(self, value):
        """Validate referral code is not empty"""
        return value

    def validate_dealerNumber(self, value):
        """Validate dealer number is not empty"""
        return value

    def validate_purpose(self, value):
        """Validate purpose is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Purpose is required")
        return value

    def validate_natureOfBusiness(self, value):
        """Validate nature of business is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nature of business is required")
        return value

    def validate_physicalAddress(self, value):
        """Validate physical address is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Physical address is required")
        return value

    def validate_estimatedMonthlyTransactionAmount(self, value):
        """Validate transaction amount is not empty"""
        if not value:
            raise serializers.ValidationError(
                "Estimated monthly transaction amount is required"
            )
        return value

    def validate_estimatedMonthlyTransactionCount(self, value):
        """Validate transaction count is not empty"""
        if not value:
            raise serializers.ValidationError(
                "Estimated monthly transaction count is required"
            )
        return value

    def validate_directors(self, value):
        """Validate directors data"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one director is required")

        for director in value:
            if (
                not director.get("directorName")
                or not director.get("directorName").strip()
            ):
                raise serializers.ValidationError("Director name is required")
            if (
                not director.get("directorIdnumber")
                or not director.get("directorIdnumber").strip()
            ):
                raise serializers.ValidationError("Director ID number is required")
            if (
                not director.get("directorMobileNumber")
                or not director.get("directorMobileNumber").strip()
            ):
                raise serializers.ValidationError("Director mobile number is required")
            if (
                not director.get("directorKraPin")
                or not director.get("directorKraPin").strip()
            ):
                raise serializers.ValidationError("Director KRA PIN is required")
            if (
                not director.get("directorDocumentType")
                or not director.get("directorDocumentType").strip()
            ):
                raise serializers.ValidationError("Director document type is required")
            if (
                not director.get("directorCountryCode")
                or not director.get("directorCountryCode").strip()
            ):
                raise serializers.ValidationError("Director country code is required")

        return value

    def create(self, validated_data):
        """Create business onboarding record in database"""
        # Extract directors data for JSON storage
        directors_data = validated_data.pop("directors", [])

        # Get company and user from context
        company = self.context.get("company")
        user = self.context.get("user")

        if not company or not user:
            raise serializers.ValidationError("Company and user context are required")

        # Create the business onboarding record
        business_onboarding = BusinessOnboarding.objects.create(
            company=company, user=user, directors=directors_data, **validated_data
        )

        return business_onboarding
