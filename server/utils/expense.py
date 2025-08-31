"""
Expense email utilities for sending approval emails.

This module provides functionality for sending expense approval emails
to company owners when variable expenses are created or updated.
"""

import os
import base64
from pathlib import Path
from typing import Dict, Any, Optional

from django.conf import settings
from django.template import Context, Template

from accounts.models import Users
from company.models import Company, Owner
from payments.models import Expense
from utils.email_utils import email_service


def get_company_owner_email(current_user: Users) -> Optional[str]:
    """
    Get the email of the company owner (user with type "company") 
    for the company that the current user belongs to.
    
    Args:
        current_user: The current user making the request
        
    Returns:
        str: Email of the company owner, or None if not found
    """
    try:
        # Find the company that the current user belongs to
        # User is connected to company through the Owner model
        if hasattr(current_user, 'owned_companies') and current_user.owned_companies.exists():
            company = current_user.owned_companies.first().company
        else:
            print(f"Could not find company for user {current_user.email}")
            return None
            
        # Find the company owner (user with type "company")
        company_owner = Users.objects.filter(
            owned_companies__company=company,
            type="company",
            is_deleted=False
        ).first()
        
        if company_owner:
            print(f"Found company owner: {company_owner.email}")
            return company_owner.email
        else:
            print(f"No company owner found for company {company.name}")
            return None
            
    except Exception as e:
        print(f"Error finding company owner: {e}")
        return None


def build_expense_context(expense: Expense, user: Users = None) -> Dict[str, Any]:
    """
    Build context for expense approval email template.
    
    Args:
        expense: Expense object
        user: User object (optional)
        
    Returns:
        dict: Context for email template
    """
    # Format expense number like the serializer
    formatted_expense_number = f"PV-{expense.created_at.strftime('%y')}-{expense.expense_number:04d}"
    
    context = {
        "expense_number": formatted_expense_number,
        "description": expense.description,
        "amount": expense.amount,
        "total_amount": expense.total_amount,
        "tax_amount": expense.tax_amount,
        "invoice_date": expense.invoice_date,
        "due_date": expense.due_date,
        "status": expense.status,
        "vendor_name": expense.vendor.name if expense.vendor else "N/A",
        "vendor_email": expense.vendor.email if expense.vendor else "N/A",
        "vendor_phone": expense.vendor.phone if expense.vendor else "N/A",
        "service_name": expense.service.name if expense.service else "N/A",
        "location_name": expense.location_node.name if expense.location_node else "N/A",
        "notes": expense.notes or "",
        "currency": expense.currency.code if expense.currency else "KES",
        "currency_symbol": expense.currency.symbol if expense.currency else "KSh",
    }
    
    # Add company information if available
    if user and hasattr(user, 'owned_companies') and user.owned_companies.exists():
        company = user.owned_companies.first().company
        
        # Build logo as base64 if logo exists (like invoice emails)
        logo_base64 = ""
        if company.logo:
            try:
                # Read the image file and convert to base64
                image_content = company.logo.read()
                if image_content:
                    logo_base64 = f"data:image/{company.logo.name.split('.')[-1]};base64,{base64.b64encode(image_content).decode('utf-8')}"
            except Exception as e:
                print(f"Error processing company logo: {e}")
                logo_base64 = ""
        
        context.update({
            "company_name": company.name,
            "company_logo": logo_base64,
            "company_address": company.address or "",
            "company_phone": company.phone or "",
            "company_email": company.email or "",
        })
    else:
        context.update({
            "company_name": "HoyHub",
            "company_logo": "",
            "company_address": "",
            "company_phone": "",
            "company_email": "",
        })
    
    return context


def send_expense_approval_email(expense: Expense, user: Users = None) -> Dict[str, Any]:
    """
    Send expense approval email to company owner.
    
    Args:
        expense: Expense object
        user: User object to get company information from
        
    Returns:
        dict: Result with success status and details
    """
    try:
        # 1. Get company owner email
        print(f"Getting company owner email for expense {expense.id}...")
        recipient_email = get_company_owner_email(user) if user else None
        
        if not recipient_email:
            print("No company owner email found")
            return {"success": False, "error": "No company owner email found"}
        
        # 2. Build context
        print(f"Building context for expense {expense.id}...")
        context = build_expense_context(expense, user)
        print(f"Context built successfully with {len(context)} items")
        
        # 3. Send email using existing email service
        print("Sending expense approval email...")
        subject = f"Expense Approval Required - #{expense.expense_number}"
        
        email_sent = email_service.send_template_email(
            recipient_email=recipient_email,
            subject=subject,
            template_name="expense_approval_template.html",
            context=context,
        )
        print(f"Email sent: {email_sent}")
        
        return {
            "success": True,
            "email_sent": email_sent,
            "recipient_email": recipient_email,
        }
        
    except Exception as e:
        print(f"Error processing expense approval email: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)} 