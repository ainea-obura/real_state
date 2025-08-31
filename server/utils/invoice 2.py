import base64
import math

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Union

import weasyprint

from django.core.files.base import ContentFile
from django.db.models import QuerySet
from django.utils import timezone

from accounts.models import Account
from company.models import Owner
from payments.models import Invoice, InvoiceItem, Penalty, Receipt
from properties.models import (
    Currencies,
    LocationNode,
    PropertyOwner,
    PropertyService,
    PropertyTenant,
)
from sales.models import PaymentSchedule, PropertySaleItem
from utils.email_utils import email_service


class InvoiceStatus(Enum):
    """Enumeration of invoice statuses for validation"""

    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class BillingType(Enum):
    """Enumeration of billing types for item categorization"""

    RENT = "RENT"
    DEPOSIT = "DEPOSIT"
    FIXED = "FIXED"
    PERCENTAGE = "PERCENTAGE"
    VARIABLE = "VARIABLE"
    PENALTY = "PENALTY"
    SERVICE_CHARGE = "SERVICE_CHARGE"
    INSTALLMENT = "INSTALLMENT"


@dataclass
class CurrencyInfo:
    """Data class for standardized currency information"""

    id: str
    code: str
    name: str
    symbol: str

    @classmethod
    def from_currency(cls, currency) -> "CurrencyInfo":
        """Factory method to create CurrencyInfo from currency object"""
        if not currency:
            return cls(id="", code="", name="", symbol="")
        return cls(
            id=str(currency.id),
            code=currency.code,
            name=currency.name,
            symbol=currency.symbol,
        )


@dataclass
class InvoiceItemData:
    """Data class for standardized invoice item information"""

    description: str
    node_name: str
    type: str
    amount: Decimal
    quantity: Decimal
    price: Decimal  # Calculated as amount × quantity
    currency: CurrencyInfo
    unit_id: str
    service_id: Optional[str] = None
    penalty_id: Optional[str] = None
    percentage_rate: Optional[Decimal] = None
    input_required: bool = False

    def to_dict(self) -> Dict:
        """Convert to dictionary format for API response"""
        return {
            "description": self.description,
            "node_name": self.node_name,
            "type": self.type,
            "amount": float(self.amount),
            "quantity": float(self.quantity),
            "price": float(self.price),
            "currency": {
                "id": self.currency.id,
                "code": self.currency.code,
                "name": self.currency.name,
                "symbol": self.currency.symbol,
            },
            "unitId": self.unit_id,
            "serviceId": self.service_id,
            "penaltyId": self.penalty_id,
            "percentage_rate": (
                float(self.percentage_rate) if self.percentage_rate else None
            ),
            "inputRequired": self.input_required,
        }


class InvoiceCalculator:
    """
    Advanced invoice calculation engine with support for quantity-based billing
    and invoice history validation.
    """

    def __init__(self, user, node: LocationNode, year: int, month: int, user_type: str):
        self.user = user
        self.node = node
        self.year = year
        self.month = month
        self.user_type = user_type
        self.period_label = self._generate_period_label()

        # Cache for performance optimization
        self._period_invoices_cache = None
        self._property_tenant_cache = None
        self._ancestor_nodes_cache = None
        self._project_node_cache = None

    def _generate_period_label(self) -> str:
        """Generate human-readable period label for invoice items"""
        start_date = datetime(self.year, self.month, 1)
        end_date = (
            datetime(self.year, self.month + 1, 1)
            if self.month < 12
            else datetime(self.year + 1, 1, 1)
        )

        start_month = start_date.strftime("%B")
        end_month = (end_date - timezone.timedelta(days=1)).strftime("%B")

        if start_month == end_month:
            return f"{start_month} {self.year}"
        else:
            return f"{start_month} - {end_month} {self.year}"

    @property
    def period_invoices(self) -> QuerySet[Invoice]:
        """Get invoices for the current period with caching"""
        if self._period_invoices_cache is None:
            self._period_invoices_cache = Invoice.objects.filter(
                status__in=[
                    InvoiceStatus.ISSUED.value,
                    InvoiceStatus.PAID.value,
                    InvoiceStatus.PARTIAL.value,
                ],
                property=self.node,
                issue_date__year=self.year,
                issue_date__month=self.month,
                is_deleted=False,
            )
        return self._period_invoices_cache

    @property
    def property_tenant(self) -> Optional[PropertyTenant]:
        """Get property tenant with caching"""
        if self._property_tenant_cache is None:
            try:
                self._property_tenant_cache = PropertyTenant.objects.get(
                    tenant_user=self.user, node=self.node, is_deleted=False
                )
            except PropertyTenant.DoesNotExist:
                self._property_tenant_cache = None
        return self._property_tenant_cache

    @property
    def property_owner(self) -> Optional[PropertyOwner]:
        """Get property owner with caching"""
        if not hasattr(self, "_property_owner_cache"):
            self._property_owner_cache = None
            try:
                self._property_owner_cache = PropertyOwner.objects.get(
                    node=self.node, is_deleted=False
                )
            except PropertyOwner.DoesNotExist:
                self._property_owner_cache = None
        return self._property_owner_cache

    @property
    def ancestor_nodes(self) -> QuerySet[LocationNode]:
        """Get ancestor nodes with caching"""
        if self._ancestor_nodes_cache is None:
            self._ancestor_nodes_cache = self.node.get_ancestors(include_self=True)
        return self._ancestor_nodes_cache

    @property
    def project_node(self) -> Optional[LocationNode]:
        """Get project node with caching"""
        if self._project_node_cache is None:
            self._project_node_cache = self.ancestor_nodes.filter(
                node_type="PROJECT"
            ).first()
        return self._project_node_cache

    def _is_item_invoiced(
        self,
        item_type: str,
        service_id: Optional[str] = None,
        penalty_id: Optional[str] = None,
    ) -> bool:
        """
        Check if an item has already been invoiced for the current period.

        Args:
            item_type: Type of item (RENT, DEPOSIT, FIXED, etc.)
            service_id: Service ID for service-based items
            penalty_id: Penalty ID for penalty items

        Returns:
            True if item is already invoiced, False otherwise
        """
        qs = InvoiceItem.objects.filter(invoice__in=self.period_invoices)

        # Build query based on item type
        if item_type == BillingType.RENT.value:
            return qs.filter(type__iexact=BillingType.RENT.value).exists()
        elif item_type == BillingType.DEPOSIT.value:
            return qs.filter(type__iexact=BillingType.DEPOSIT.value).exists()
        elif item_type == BillingType.SERVICE_CHARGE.value:
            return qs.filter(type__iexact=BillingType.SERVICE_CHARGE.value).exists()
        elif item_type in [
            BillingType.FIXED.value,
            BillingType.PERCENTAGE.value,
            BillingType.VARIABLE.value,
        ]:
            if service_id:
                return qs.filter(type__iexact=item_type, service_id=service_id).exists()
        elif item_type == BillingType.PENALTY.value:
            if penalty_id:
                return qs.filter(
                    type__iexact=BillingType.PENALTY.value, penalty_id=penalty_id
                ).exists()

            return False
        elif item_type == BillingType.INSTALLMENT.value:
            if service_id:
                return qs.filter(
                    type__iexact=BillingType.INSTALLMENT.value, service_id=service_id
                ).exists()
            return False

    def _calculate_quantity_from_dates(self, start_date, end_date) -> Decimal:
        """
        Calculate quantity based on date range (number of months).

        Args:
            start_date: Start date of the period
            end_date: End date of the period

        Returns:
            Quantity as Decimal (e.g., 4.0 for 4 months)
        """
        if not start_date or not end_date:
            return Decimal("1.0")

        # Calculate months between dates
        months = (end_date.year - start_date.year) * 12 + (
            end_date.month - start_date.month
        )

        # Add 1 if there are any days in the end month
        if end_date.day > 1:
            months += 1

        return Decimal(str(max(1, months)))

    def _calculate_quantity_from_frequency(self, frequency: str) -> Decimal:
        """
        Calculate quantity based on service frequency.

        Args:
            frequency: Service frequency (DAILY, MONTHLY, QUARTERLY, YEARLY)

        Returns:
            Quantity as Decimal based on frequency
        """
        frequency_map = {
            "DAILY": Decimal("30"),  # 30 days = 1 month equivalent
            "MONTHLY": Decimal("1"),  # 1 month
            "QUARTERLY": Decimal("3"),  # 3 months
            "YEARLY": Decimal("12"),  # 12 months
        }

        return frequency_map.get(frequency, Decimal("1"))

    def _create_currency_info(self, currency, fallback_currency=None) -> CurrencyInfo:
        """
        Create currency information with fallback support.

        Args:
            currency: Primary currency object
            fallback_currency: Fallback currency if primary is None

        Returns:
            CurrencyInfo object
        """
        target_currency = currency or fallback_currency
        return CurrencyInfo.from_currency(target_currency)

    def _create_invoice_item(
        self,
        description: str,
        amount: Decimal,
        quantity: Decimal,
        item_type: str,
        currency: CurrencyInfo,
        unit_id: str,
        service_id: Optional[str] = None,
        penalty_id: Optional[str] = None,
        percentage_rate: Optional[Decimal] = None,
        input_required: bool = False,
    ) -> InvoiceItemData:
        """
        Create standardized invoice item data.

        Args:
            description: Item description
            amount: Single item amount
            quantity: Number of items
            item_type: Type of item
            currency: Currency information
            unit_id: Unit ID
            service_id: Optional service ID
            penalty_id: Optional penalty ID
            percentage_rate: Optional percentage rate
            input_required: Whether input is required

        Returns:
            InvoiceItemData object
        """
        price = amount * quantity

        return InvoiceItemData(
            description=description,
            node_name=self.node.name,
            type=item_type,
            amount=amount,
            quantity=quantity,
            price=price,
            currency=currency,
            unit_id=unit_id,
            service_id=service_id,
            penalty_id=penalty_id,
            percentage_rate=percentage_rate,
            input_required=input_required,
        )

    def _calculate_management_fee(self) -> Optional[InvoiceItemData]:
        """
        Calculate service charge for SERVICE_ONLY units (collected from owners).

        Returns:
            InvoiceItemData for service charge or None if not applicable
        """
        if self.user_type != "owner":
            return None

        # Check if unit has SERVICE_ONLY management mode
        unit_detail = getattr(self.node, "unit_detail", None)
        villa_detail = getattr(self.node, "villa_detail", None)

        management_fee = None
        currency = None

        if unit_detail:
            management_fee = unit_detail.service_charge
            currency = unit_detail.currency

        if villa_detail:
            management_fee = villa_detail.service_charge
            # VillaDetail doesn't have currency field, so we'll use a fallback

        if not management_fee or management_fee <= 0:
            return None

        # Check if already invoiced
        if self._is_item_invoiced(BillingType.SERVICE_CHARGE.value):
            return None

        # For owners, we don't have contract dates like tenants do
        # Use quantity = 1 for monthly billing
        quantity = Decimal("1.0")

        # Get currency from unit_detail or use a fallback
        currency_info = self._create_currency_info(currency)

        return self._create_invoice_item(
            description="Service Charge",
            amount=management_fee,
            quantity=quantity,
            item_type=BillingType.SERVICE_CHARGE.value,
            currency=currency_info,
            unit_id=str(self.node.id),
        )

    def _calculate_rent_item(self) -> Optional[InvoiceItemData]:
        """
        Calculate rent item with quantity-based billing.

        Returns:
            InvoiceItemData for rent or None if not applicable
        """
        if self.user_type != "tenant":
            return None

        pt = self.property_tenant
        if not pt or pt.rent_amount is None:
            return None

        # Check if already invoiced
        if self._is_item_invoiced(BillingType.RENT.value):
            return None

        # Rent is always quantity = 1 (monthly billing)
        quantity = Decimal("1.0")

        currency_info = self._create_currency_info(pt.currency)

        return self._create_invoice_item(
            description=f"Rent for {self.period_label}",
            amount=pt.rent_amount,
            quantity=quantity,
            item_type=BillingType.RENT.value,
            currency=currency_info,
            unit_id=str(self.node.id),
        )

    def _calculate_deposit_item(self) -> Optional[InvoiceItemData]:
        """
        Calculate deposit item (always quantity = 1).

        Returns:
            InvoiceItemData for deposit or None if not applicable
        """
        if self.user_type != "tenant":
            return None

        pt = self.property_tenant
        if not pt or not pt.deposit_amount or pt.deposit_amount <= 0:
            return None

        # Check if deposit already paid
        has_paid_deposit = Receipt.objects.filter(
            invoice__tenants=pt,
            invoice__property=self.node,
        ).exists()

        if has_paid_deposit:
            return None

        # Check if already invoiced
        if self._is_item_invoiced(BillingType.DEPOSIT.value):
            return None

        currency_info = self._create_currency_info(pt.currency)

        return self._create_invoice_item(
            description=f"Deposit for {self.node.name}",
            amount=pt.deposit_amount,
            quantity=Decimal("1.0"),  # Deposits are always quantity = 1
            item_type=BillingType.DEPOSIT.value,
            currency=currency_info,
            unit_id=str(self.node.id),
        )

    def _calculate_service_items(self) -> List[InvoiceItemData]:
        """
        Calculate service items with quantity-based billing.

        Returns:
            List of InvoiceItemData for services
        """
        items = []

        # Determine billed_to filter based on user type
        billed_to_filter = "TENANT" if self.user_type == "tenant" else "OWNER"

        # Get services for the current node
        services = PropertyService.objects.filter(
            property_node=self.node,
            service__billed_to=billed_to_filter,
            service__is_deleted=False,
            is_deleted=False,
        ).select_related("service", "currency")

        # For owners, also include project-level services
        if self.user_type == "owner" and self.project_node:
            project_services = PropertyService.objects.filter(
                property_node=self.project_node,
                service__billed_to=billed_to_filter,
                service__is_deleted=False,
                is_deleted=False,
            ).select_related("service", "currency")

            # Combine services, avoiding duplicates
            all_services = list(services)
            for ps in project_services:
                if ps not in all_services:
                    all_services.append(ps)
            services = all_services

        for svc in services:
            # Check if already invoiced
            if self._is_item_invoiced(
                svc.service.pricing_type.upper(), service_id=svc.id
            ):
                continue

            # Calculate service amount and type
            service_data = self._calculate_service_amount(svc)
            if not service_data:
                continue

            # Calculate quantity based on service frequency (ignore ONE_TIME and WEEKLY)
            frequency = svc.service.frequency
            if frequency in ["ONE_TIME", "WEEKLY"]:
                continue  # Skip these frequencies

            quantity = self._calculate_quantity_from_frequency(frequency)

            # Get currency information
            currency_info = self._create_currency_info(
                svc.currency,
                self.property_tenant.currency if self.property_tenant else None,
            )

            item = self._create_invoice_item(
                description=svc.service.name,
                amount=service_data["amount"],
                quantity=quantity,
                item_type=service_data["type"],
                currency=currency_info,
                unit_id=str(self.node.id),
                service_id=str(svc.id),
                percentage_rate=service_data.get("percentage_rate"),
                input_required=service_data["input_required"],
            )

            items.append(item)

        return items

    def _calculate_service_amount(self, service: PropertyService) -> Optional[Dict]:
        """
        Calculate service amount based on pricing type.

        Args:
            service: PropertyService object

        Returns:
            Dictionary with service calculation data or None if invalid
        """
        svc_type = service.service.pricing_type.lower()

        if svc_type == "fixed":
            return {
                "type": BillingType.FIXED.value,
                "amount": service.service.base_price or Decimal("0"),
                "percentage_rate": None,
                "input_required": False,
            }
        elif svc_type == "percentage":
            return {
                "type": BillingType.PERCENTAGE.value,
                "amount": Decimal("0"),
                "percentage_rate": service.service.percentage_rate or Decimal("0"),
                "input_required": False,
            }
        elif svc_type == "variable":
            return {
                "type": BillingType.VARIABLE.value,
                "amount": Decimal("0"),
                "percentage_rate": None,
                "input_required": True,
            }

        return None

    def _calculate_penalty_items(self) -> List[InvoiceItemData]:
        """
        Calculate penalty items.

        Returns:
            List of InvoiceItemData for penalties
        """
        items = []

        if self.user_type != "tenant":
            return items

        pt = self.property_tenant
        if not pt:
            return items

        # Get pending penalties
        penalties = Penalty.objects.filter(
            property_tenant=pt,
            status="pending",
        )

        for penalty in penalties:
            # Check if already invoiced
            if self._is_item_invoiced(BillingType.PENALTY.value, penalty_id=penalty.id):
                continue

            currency_info = self._create_currency_info(penalty.currency, pt.currency)

            item = self._create_invoice_item(
                description=penalty.get_penalty_type_display(),
                amount=penalty.amount,
                quantity=Decimal("1.0"),  # Penalties are always quantity = 1
                item_type=BillingType.PENALTY.value,
                currency=currency_info,
                unit_id=str(self.node.id),
                penalty_id=str(penalty.id),
            )

            items.append(item)

        return items

    def _calculate_installment_items(self) -> List[InvoiceItemData]:
        """
        Calculate installment items for property owners.
        Gets due installments from PaymentSchedule for the current owner and property.
        """
        items = []

        # Only calculate for owners
        if self.user_type != "owner":
            return items

        # Get the property owner relationship
        po = self.property_owner
        if not po:
            return items

        # Find sale items for this owner where:
        # 1. Owner is the buyer
        # 2. Sale status is active/completed
        sale_items = PropertySaleItem.objects.filter(
            buyer=self.user,
            # sale__status__in=["active", "completed"]
        )

        for sale_item in sale_items:
            # Get payment plan for this sale item
            try:
                payment_plan = sale_item.payment_plan
                print("Payment plan", payment_plan)
                if not payment_plan or payment_plan.payment_type != "installments":
                    continue

                # Get due installments for current month/year (simplified)
                print(
                    f"Looking for installments in year: {self.year}, month: {self.month}"
                )
                due_installments = PaymentSchedule.objects.filter(
                    payment_plan=payment_plan,
                    status="pending",
                    due_date__year=self.year,
                    due_date__month=self.month,
                )
                print(f"Due installments found: {due_installments.count()}")
                if due_installments.exists():
                    for inst in due_installments:
                        print(
                            f"  - Installment {inst.payment_number}: due {inst.due_date}, amount {inst.amount}"
                        )

                for installment in due_installments:
                    # Check if already invoiced
                    if self._is_item_invoiced(
                        "INSTALLMENT", service_id=str(installment.id)
                    ):
                        continue

                    # Get default currency and pass None for user_currency
                    default_currency = Currencies.objects.filter(default=True).first()
                    currency_info = self._create_currency_info(default_currency, None)

                    # Create installment item
                    item = self._create_invoice_item(
                        description=f"Installment {installment.payment_number} - {sale_item.property_node.name}",
                        amount=installment.amount,
                        quantity=Decimal("1.0"),
                        item_type="INSTALLMENT",
                        currency=currency_info,
                        unit_id=str(sale_item.property_node.id),  # Use the property node from sale item
                        service_id=str(installment.id),
                    )

                    items.append(item)

            except Exception as e:
                # Log error but continue with other items
                print(
                    f"Error calculating installment for sale item {sale_item.id}: {e}"
                )
                continue

        return items

    def _get_due_installments_for_period(self, payment_plan, year, month) -> List:
        """
        Get installments due for a specific period based on payment plan frequency.

        Args:
            payment_plan: PaymentPlan object
            year: Target year
            month: Target month

        Returns:
            List of PaymentSchedule objects due for this period
        """
        if not payment_plan or payment_plan.payment_type != "installments":
            return []

        # Get all pending installments for this payment plan
        all_pending = PaymentSchedule.objects.filter(
            payment_plan=payment_plan, status="pending"
        ).order_by("due_date")

        if not all_pending.exists():
            return []

        # Calculate which installments are due for this period based on frequency
        due_installments = []

        for installment in all_pending:
            installment_date = installment.due_date

            # Check if this installment is due for the current period
            if self._is_installment_due_for_period(
                installment_date, year, month, payment_plan.frequency
            ):
                due_installments.append(installment)

        return due_installments

    def _is_installment_due_for_period(
        self, installment_date, target_year, target_month, frequency
    ) -> bool:
        """
        Check if an installment is due for a specific period based on frequency.

        Args:
            installment_date: Due date of the installment
            target_year: Target year to check
            target_month: Target month to check
            frequency: Payment frequency (monthly, quarterly, semi-annual, annual)

        Returns:
            True if installment is due for this period, False otherwise
        """
        if not installment_date:
            return False

        # Convert dates to comparable values
        target_date = timezone.datetime(target_year, target_month, 1).date()
        installment_year = installment_date.year
        installment_month = installment_date.month

        # For monthly frequency: check if month matches
        if frequency == "monthly":
            return installment_year == target_year and installment_month == target_month

        # For quarterly frequency: check if it's a quarter month
        elif frequency == "quarterly":
            if installment_year != target_year:
                return False
            # Quarters: Jan(1), Apr(4), Jul(7), Oct(10)
            quarter_months = [1, 4, 7, 10]
            return (
                installment_month in quarter_months
                and installment_month == target_month
            )
        elif frequency == "semi-annual":
            if installment_year != target_year:
                return False
            # Semi-annual: Jan(1), Jul(7)
            semi_annual_months = [1, 7]
            return (
                installment_month in semi_annual_months
                and installment_month == target_month
            )

        # For annual frequency: check if it's an annual month
        elif frequency == "annual":
            if installment_year != target_year:
                return False
            # Annual: typically January (1), but could be any month
            return installment_month == target_month

        # Default: monthly behavior
        return installment_year == target_year and installment_month == target_month

    def calculate_items(self) -> List[Dict]:
        """
        Main method to calculate all invoice items with advanced logic.

        Returns:
            List of invoice items as dictionaries
        """
        items = []

        # Calculate items based on user type
        if self.user_type == "tenant":
            # Add rent item
            rent_item = self._calculate_rent_item()
            if rent_item:
                items.append(rent_item.to_dict())

            # Add deposit item
            deposit_item = self._calculate_deposit_item()
            if deposit_item:
                items.append(deposit_item.to_dict())

        elif self.user_type == "owner":
            # Add service charge item for owners
            service_charge_item = self._calculate_management_fee()
            if service_charge_item:
                items.append(service_charge_item.to_dict())

            # Add installment items for owners
            installment_items = self._calculate_installment_items()
            print(f"Installment items: {installment_items}")
            print(f"Number of installment items: {len(installment_items)}")
            items.extend([item.to_dict() for item in installment_items])
            print(f"Total items after adding installments: {len(items)}")

        # Add service items (for both tenants and owners)
        service_items = self._calculate_service_items()
        items.extend([item.to_dict() for item in service_items])

        # Add penalty items (for tenants only)
        penalty_items = self._calculate_penalty_items()
        items.extend([item.to_dict() for item in penalty_items])

        return items


def custom_round(value: Union[float, Decimal], decimals: int = 2) -> float:
    """
    Advanced rounding function with custom logic.

    Rounds up if decimal is 0.5 or greater, rounds down if less than 0.5.

    Args:
        value: Value to round
        decimals: Number of decimal places

    Returns:
        Rounded value as float
    """
    multiplier = 10**decimals
    decimal_part = value * multiplier % 1

    if decimal_part >= 0.5:
        return math.ceil(value * multiplier) / multiplier
    else:
        return math.floor(value * multiplier) / multiplier


def get_missing_invoice_items(user, node, year, month, user_type, period_label=None):
    """
    Legacy function for backward compatibility.

    This function now delegates to the new InvoiceCalculator class.
    """
    calculator = InvoiceCalculator(user, node, year, month, user_type)
    return calculator.calculate_items()


def build_invoice_context(invoice, user=None):
    """
    Build context data for invoice template from invoice data.

    Args:
        invoice: Invoice object
        user: User object to get company information from

    Returns:
        dict: Context data for template rendering
    """
    # Get recipient information
    recipient_name = _get_recipient_name(invoice)
    recipient_email = _get_recipient_email(invoice)
    recipient_address = _get_recipient_address(invoice)

    # Get currency information
    currency_symbol = _get_currency_symbol(invoice)

    # Build items list
    items = _build_items_list(invoice)

    # Get company information from user
    company_info = _get_company_info(user)

    # Handle date formatting safely
    def format_date(date_obj):
        if hasattr(date_obj, "strftime"):
            return date_obj.strftime("%Y-%m-%d")
        elif isinstance(date_obj, str):
            return date_obj
        else:
            return str(date_obj)

    return {
        # Invoice Information
        "invoice_number": f"INV-{invoice.issue_date}-{invoice.invoice_number:04d}",
        "issue_date": format_date(invoice.issue_date),
        "due_date": format_date(invoice.due_date),
        "invoice_status": invoice.status.lower(),
        # Recipient Information
        "recipient_name": recipient_name,
        "recipient_email": recipient_email,
        "recipient_address": recipient_address,
        # Company Information
        "company_name": company_info.get("name", ""),
        "company_website": company_info.get("website", ""),
        "company_email": company_info.get("email", ""),
        "company_phone": company_info.get("phone", ""),
        "company_address": company_info.get("address", ""),
        "company_logo_url": company_info.get("logo_url", ""),
        # Financial Details
        "currency_symbol": currency_symbol,
        "grand_total": _format_currency(invoice.balance, currency_symbol),
        "subtotal": _format_currency(invoice.total_amount, currency_symbol),
        "discount_amount": _format_currency(invoice.discount, currency_symbol),
        # Items
        "items": items,
        # Payment Information
        "bank_name": company_info.get("bank_name", ""),
        "account_name": company_info.get("account_name", ""),
        "account_number": company_info.get("account_number", ""),
        "paybill_number": company_info.get("paybill_number", ""),
        # Download Links
        "download_url": f"/api/invoices/{invoice.id}/download",
        "dashboard_url": "/dashboard/invoices",
    }


def _get_recipient_name(invoice):
    """Get recipient name from tenants or owners"""
    # Check tenants first
    if invoice.tenants.exists():
        tenant = invoice.tenants.first()
        if tenant.tenant_user:
            return f"{tenant.tenant_user.first_name} {tenant.tenant_user.last_name}".strip()

    # Check owners
    if invoice.owners.exists():
        owner = invoice.owners.first()
        if owner.owner_user:
            return f"{owner.owner_user.first_name} {owner.owner_user.last_name}".strip()

    return "Recipient"


def _get_recipient_email(invoice):
    """Get recipient email from tenants or owners"""
    # Check tenants first
    if invoice.tenants.exists():
        tenant = invoice.tenants.first()
        if tenant.tenant_user:
            return tenant.tenant_user.email

    # Check owners
    if invoice.owners.exists():
        owner = invoice.owners.first()
        if owner.owner_user:
            return owner.owner_user.email

    return "recipient@example.com"


def _get_recipient_address(invoice):
    """Get recipient address from property"""
    try:
        # Get property address from the invoice's property
        property_node = invoice.property
        ancestors = list(property_node.get_ancestors(include_self=True))
        address_parts = [node.name for node in ancestors if node.name]
        return " -> ".join(address_parts)
    except Exception as e:
        return "Property Address"


def _get_company_info(user):
    """
    Get company information from user's owned companies.

    Args:
        user: User object

    Returns:
        dict: Company information or empty dict if no company found
    """
    if not user:
        return {}

    try:
        # Get the first company owned by the user
        owner = (
            Owner.objects.filter(user=user, company__is_deleted=False, is_deleted=False)
            .select_related("company")
            .first()
        )

        if not owner or not owner.company:
            return {}

        company = owner.company

        # Build logo as base64 if logo exists
        logo_base64 = ""
        if company.logo:
            try:
                # Download the image from MinIO and convert to base64
                # Read the image file
                image_content = company.logo.read()
                if image_content:
                    # Convert to base64
                    logo_base64 = f"data:image/{company.logo.name.split('.')[-1]};base64,{base64.b64encode(image_content).decode('utf-8')}"
            except Exception as e:
                print(f"Error processing company logo: {e}")
                logo_base64 = ""

        # Get user's default account for payment information
        default_account = Account.objects.filter(
            user=user, is_default=True, is_active=True
        ).first()

        payment_info = {
            "bank_name": "",
            "account_name": "",
            "account_number": "",
            "paybill_number": "",
        }

        if default_account:
            payment_info = {
                "bank_name": default_account.bank_name or "",
                "account_name": default_account.account_name or "",
                "account_number": default_account.account_number or "",
                "paybill_number": default_account.account_code
                or "",  # Using account_code as paybill
            }

        return {
            "name": company.name or "",
            "website": company.website or "",
            "email": company.email or "",
            "phone": company.phone or "",
            "address": company.address or "",
            "logo_url": logo_base64,
            **payment_info,  # Include payment information
        }
    except Exception as e:
        print(f"Error getting company info: {e}")
        return {}


def _get_currency_symbol(invoice):
    currency = Currencies.objects.filter(default=True).first()

    if currency:
        return currency.symbol

    return "KES"


def _format_currency(amount, symbol):
    """Format currency amount with symbol"""
    return f"{symbol} {amount:,.2f}"


def _build_items_list(invoice):
    """Build items list for template"""
    items = []
    currency_symbol = _get_currency_symbol(invoice)

    for i, item in enumerate(invoice.items.all(), 1):
        items.append(
            {
                "number": i,
                "description": item.name,
                "price": _format_currency(item.amount, currency_symbol),
                "quantity": int(item.quantity),
                "subtotal": _format_currency(item.price, currency_symbol),
            }
        )
    return items


def generate_invoice_pdf(invoice, html_content):
    """
    Generate PDF from HTML content using WeasyPrint with A4 formatting and responsive design.

    Args:
        invoice: Invoice object
        html_content (str): HTML content to convert to PDF

    Returns:
        str: Path to generated PDF file
    """
    try:
        # Add responsive CSS for A4 formatting
        responsive_css = """
        <style>
            @page {
                size: A4;
                margin: 0;
                padding: 0;
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
            }
            
            .invoice-container {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin: 0;
                padding: 10px;
                page-break-inside: avoid;
            }
            
            .company-info {
                flex: 1;
                max-width: 50%;
            }
            
            .invoice-info {
                flex: 1;
                text-align: right;
                max-width: 50%;
            }
            
            .recipient-info {
                margin: 0;
                padding: 10px;
                page-break-inside: avoid;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 0;
                padding: 0;
                page-break-inside: avoid;
            }
            
            .items-table th,
            .items-table td {
                border: 1px solid #ddd;
                padding: 4px;
                text-align: left;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .items-table th {
                background-color: #f5f5f5;
                font-weight: bold;
            }
            
            .summary-section {
                margin: 0;
                padding: 10px;
                page-break-inside: avoid;
            }
            
            .summary-table {
                width: 100%;
                max-width: 300px;
                margin-left: auto;
                border-collapse: collapse;
            }
            
            .summary-table td {
                padding: 3px 8px;
                border-bottom: 1px solid #ddd;
            }
            
            .total-row {
                font-weight: bold;
                border-top: 2px solid #333;
            }
            
            .text-wrap {
                word-wrap: break-word;
                overflow-wrap: break-word;
                white-space: normal;
            }
            
            .long-text {
                max-width: 200px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            @media print {
                .page-break {
                    page-break-before: always;
                }
                
                .no-break {
                    page-break-inside: avoid;
                }
            }
        </style>
        """

        # Wrap HTML content with responsive CSS
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            {responsive_css}
        </head>
        <body>
            <div class="invoice-container">
                {html_content}
            </div>
        </body>
        </html>
        """

        # Create PDF from HTML with A4 settings
        pdf_bytes = weasyprint.HTML(string=full_html).write_pdf(
            stylesheets=[], presentational_hints=True
        )

        # Generate filename
        filename = f"invoice_{invoice.invoice_number:04d}_{invoice.id}.pdf"

        # Save PDF to the invoice's pdf_file field using Django's FileField
        invoice.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)

        return invoice.pdf_file.name
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return None


def send_invoice_email(invoice, user=None, custom_message=None):
    """
    Send invoice email using the existing email service.

    Args:
        invoice: Invoice object
        user: User object to get company information from
        custom_message: Optional custom message to include

    Returns:
        dict: Result with success status and details
    """
    try:
        # 1. Build context
        print(f"Building context for invoice {invoice.id}...")
        context = build_invoice_context(invoice, user)
        print(f"Context built successfully with {len(context)} items")

        # Add custom message if provided
        if custom_message:
            context["custom_message"] = custom_message

        # 2. Render template to HTML
        print("Rendering template...")
        template_content = email_service._load_template("invoice_email_template.html")
        html_content = email_service._render_template(template_content, context)
        print(f"Template rendered successfully ({len(html_content)} characters)")

        # 3. Generate PDF
        print("Generating PDF...")
        pdf_file_path = generate_invoice_pdf(invoice, html_content)
        if pdf_file_path:
            print(f"PDF generated and saved to database: {pdf_file_path}")
            # Save the invoice to persist the PDF file reference
            invoice.save()
            print("Invoice saved with PDF file")

        # 3. Send email using existing email service
        print("Sending email...")
        recipient_email = _get_recipient_email(invoice)
        if not recipient_email:
            print("No recipient email found")
            return {"success": False, "error": "No recipient email found"}

        # Create appropriate subject based on status
        if invoice.status.upper() == "CANCELLED":
            subject = f"Invoice INV-{invoice.invoice_number:04d} - CANCELLED"
        else:
            subject = f"Invoice INV-{invoice.invoice_number:04d} - {invoice.status}"

        email_sent = email_service.send_template_email(
            recipient_email=recipient_email,
            subject=subject,
            template_name="invoice_email_template.html",
            context=context,
        )
        print(f"Email sent: {email_sent}")

        return {
            "success": True,
            "pdf_generated": pdf_file_path is not None,
            "email_sent": email_sent,
            "pdf_path": pdf_file_path,
        }
    except Exception as e:
        print(f"Error processing invoice email: {e}")
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


def send_reminder_email(invoice, user=None, reminder_type="upcoming"):
    """
    Send reminder email using the existing email service.

    Args:
        invoice: Invoice object
        user: User object to get company information from
        reminder_type: Type of reminder ("overdue" or "upcoming")

    Returns:
        dict: Result with success status and details
    """
    try:
        # 1. Build reminder context
        print(f"Building reminder context for invoice {invoice.id}...")
        context = build_reminder_context(invoice, user, reminder_type)
        print(f"Reminder context built successfully with {len(context)} items")

        # 2. Send email using existing email service
        print("Sending reminder email...")
        recipient_email = _get_recipient_email(invoice)
        if not recipient_email:
            print("No recipient email found")
            return {"success": False, "error": "No recipient email found"}

        # Create appropriate subject based on reminder type
        if reminder_type == "outstanding":
            subject = f"Outstanding Invoice Reminder: INV-{invoice.invoice_number:04d}"
        elif reminder_type == "overdue":
            subject = f"Overdue Invoice Reminder: INV-{invoice.invoice_number:04d}"
        else:
            subject = f"Upcoming Invoice: INV-{invoice.invoice_number:04d}"

        email_sent = email_service.send_template_email(
            recipient_email=recipient_email,
            subject=subject,
            template_name="rent_reminder.html",
            context=context,
        )
        print(f"Reminder email sent: {email_sent}")

        return {
            "success": True,
            "email_sent": email_sent,
            "reminder_type": reminder_type,
        }
    except Exception as e:
        print(f"Error processing reminder email: {e}")
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


def build_reminder_context(invoice, user=None, reminder_type="upcoming"):
    """
    Build context data for reminder template from invoice data.

    Args:
        invoice: Invoice object
        user: User object to get company information from
        reminder_type: Type of reminder ("overdue" or "upcoming")

    Returns:
        dict: Context data for template rendering
    """
    # Get recipient information
    recipient_name = _get_recipient_name(invoice)
    recipient_email = _get_recipient_email(invoice)
    property_name = _get_recipient_address(invoice)

    # Get company information from user - return empty if no company found
    company_info = _get_company_info(user)

    # Get currency information like in invoice emails
    currency_symbol = _get_currency_symbol(invoice)

    # Get remaining balance (what user still needs to pay)
    remaining_balance = invoice.balance if invoice.balance > 0 else invoice.total_amount

    # Handle date formatting safely
    def format_date(date_obj):
        if hasattr(date_obj, "strftime"):
            return date_obj.strftime("%B %d, %Y")
        elif isinstance(date_obj, str):
            return date_obj
        else:
            return str(date_obj)

    return {
        # Invoice Information - use same format as invoice emails
        "invoice_number": f"INV-{invoice.issue_date.strftime('%y')}-{invoice.invoice_number:04d}",
        "due_date": format_date(invoice.due_date),
        "total_amount": _format_currency(remaining_balance, currency_symbol),
        "reminder_type": reminder_type,
        # Recipient Information
        "tenant_name": recipient_name,
        "tenant_email": recipient_email,
        "property_name": property_name,
        # Company Information - only use if company exists, otherwise empty
        "company_name": company_info.get("name", ""),
        "company_website": company_info.get("website", ""),
        "company_email": company_info.get("email", ""),
        "company_phone": company_info.get("phone", ""),
        "company_address": company_info.get("address", ""),
        "company_logo_url": company_info.get("logo_url", ""),
    }
