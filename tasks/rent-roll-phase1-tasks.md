# Rent Roll Phase 1 Tasks

## Overview
Phase 1 focuses on basic data integration: summary statistics and table listing for the rent-roll feature.

## Database Models Required
- `LocationNode` (properties/models.py) - Unit hierarchy
- `UnitDetail` (properties/models.py) - Unit details
- `VillaDetail` (property/models.py) - for villa renting
- `PropertyTenant` (properties/models.py) - Tenant assignments
- `Invoice` (payments/models.py) - Billing records
- `Receipt` (payments/models.py) - Payment records
- `Users` (accounts/models.py) - Tenant information
- `Company` (company/models.py) - Company information

## Phase 1 Tasks

### Backend Implementation

#### 1. Serializer Layer
- [x] **Task 1.1**: Create `RentRollUnitSerializer` in `server/payments/rent-rolls/serializers.py`
  - Map LocationNode + UnitDetail + PropertyTenant + Invoice data
  - Calculate unit status (vacant/occupied/paid/unpaid/partial/late)
  - Calculate payment progress percentage
  - Calculate outstanding balance
  - Include tenant information and contact details

- [x] **Task 1.2**: Create `RentRollSummarySerializer` in `server/payments/rent-rolls/serializers.py`
  - Calculate total units count
  - Calculate occupied vs vacant units
  - Calculate rent expected vs collected
  - Calculate outstanding balance

- [x] **Task 1.3**: Create calculation utility functions in `server/payments/rent-rolls/utils.py`
  - `calculate_unit_status()` - Determine unit status based on tenant and invoice data
  - `calculate_payment_progress()` - Calculate payment percentage
  - `calculate_outstanding_balance()` - Calculate remaining balance
  - `calculate_next_due_date()` - Determine next payment due date

#### 2. View Layer
- [x] **Task 1.4**: Create `RentRollViewSet` in `server/payments/rent-rolls/views.py`
  - Implement `list()` method for rent roll table data
  - Implement `summary()` method for statistics
  - Add filtering by date range and status
  - Add pagination support
  - Add company/project filtering

- [x] **Task 1.5**: Add proper error handling and validation
  - Handle missing data gracefully
  - Validate date ranges
  - Add proper HTTP status codes

#### 3. URL Configuration
- [x] **Task 1.6**: Create `server/payments/rent-rolls/routes.py`
  - Define rent roll list endpoint: `GET /api/rent-roll/`
  - Define summary endpoint: `GET /api/rent-roll/summary/`
  - Add query parameter support for filtering

- [x] **Task 1.7**: Integrate routes into main URL configuration
  - Add rent-rolls URLs to main payments URLs
  - Ensure proper authentication middleware

#### 4. Data Queries and Calculations
- [x] **Task 1.8**: Implement efficient database queries
  - Use `select_related()` and `prefetch_related()` for performance
  - Optimize queries to minimize database hits
  - Add proper indexing considerations

- [x] **Task 1.9**: Implement summary statistics calculations
  - Total units: Count all UNIT nodes under company projects
  - Occupied units: Count active PropertyTenant records
  - Vacant units: Total - Occupied
  - Rent expected: Sum of active tenant rent amounts
  - Collected: Sum of paid receipts for current period
  - Outstanding: Expected - Collected

### Key Calculations Required

#### Unit Status Logic
```python
def get_unit_status(unit_detail, property_tenant, invoices):
    if not property_tenant:
        return "vacant"
    
    # Check for overdue invoices
    overdue_invoices = invoices.filter(
        due_date__lt=timezone.now().date(),
        status__in=['ISSUED', 'OVERDUE']
    )
    
    if overdue_invoices.exists():
        return "late"
    
    # Check current month payment status
    current_month_invoice = invoices.filter(
        issue_date__month=timezone.now().month,
        issue_date__year=timezone.now().year
    ).first()
    
    if not current_month_invoice:
        return "unpaid"
    
    if current_month_invoice.status == "PAID":
        return "paid"
    elif current_month_invoice.balance > 0:
        return "partial"
    else:
        return "unpaid"
```

#### Payment Progress Calculation
```python
def calculate_payment_progress(invoice, receipts):
    if not invoice:
        return 0
    
    total_paid = receipts.aggregate(
        total=Sum('paid_amount')
    )['total'] or 0
    
    progress = (total_paid / invoice.total_amount) * 100
    return min(progress, 100)
```

#### Outstanding Balance Calculation
```python
def calculate_outstanding_balance(invoice, receipts):
    if not invoice:
        return 0
    
    total_paid = receipts.aggregate(
        total=Sum('paid_amount')
    )['total'] or 0
    
    return invoice.total_amount - total_paid
```

### Testing Tasks
- [ ] **Task 1.10**: Create test data for rent roll scenarios
  - Units with different statuses (vacant, occupied, paid, unpaid, late)
  - Various payment scenarios
  - Different date ranges

- [ ] **Task 1.11**: Test API endpoints manually
  - Test `/api/rent-roll/` endpoint
  - Test `/api/rent-roll/summary/` endpoint
  - Test filtering and pagination
  - Verify calculations accuracy

### Files to Create/Modify

#### New Files
- `server/payments/rent-rolls/serializers.py`
- `server/payments/rent-rolls/views.py`
- `server/payments/rent-rolls/routes.py`
- `server/payments/rent-rolls/utils.py`

#### Files to Modify
- `server/payments/urls.py` (add rent-rolls routes)

### Success Criteria
- [ ] API endpoints return correct data structure
- [ ] Summary statistics are accurate
- [ ] Unit status calculations are correct
- [ ] Payment progress calculations are accurate
- [ ] Outstanding balance calculations are correct
- [ ] API responds within acceptable time limits
- [ ] Proper error handling for edge cases

## Next Phase Preparation
After Phase 1 completion, we'll move to Phase 2 which includes:
- Mark as paid functionality
- Send reminder system
- View ledger integration 