"use server";

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export interface TransactionsListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export async function getTransactions() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: 'Authentication required' };
    }

    const response = await fetch(`${API_BASE_URL}/finance/payments/transactions`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      throw new Error('Failed to fetch transactions');
    }

    const data = await response.json();
    console.log('=== TRANSACTIONS API RESPONSE ===');
    console.log('Response status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('================================');
    
    return data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { error: true, message: 'Failed to fetch transactions' };
  }
}

export async function fetchTransactionsList(params: TransactionsListParams = {}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: 'Authentication required' };
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const url = `${API_BASE_URL}/finance/payments/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      throw new Error('Failed to fetch transactions list');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching transactions list:', error);
    return { error: true, message: 'Failed to fetch transactions list' };
  }
}

export async function checkApartmentExists(apartmentNumber: string): Promise<{
  exists: boolean;
  status: 'checking' | 'exists' | 'not_found' | 'error';
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        exists: false,
        status: 'error'
      };
    }

    const response = await fetch(`${API_BASE_URL}/projects/apartments/check?number=${apartmentNumber}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      exists: response.ok,
      status: response.ok ? 'exists' : 'not_found'
    };
  } catch (error) {
    console.error('Error checking apartment:', error);
    return {
      exists: false,
      status: 'error'
    };
  }
}

export async function updateUnpaidBills(transactionData: {
  transaction_id: string;
  apartment_number: string;
  amount: string;
  payment_method: string;
  trans_time: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { success: false, message: 'Authentication required' };
    }

    console.log('=== UPDATE BILLS API CALL ===');
    console.log('URL:', `${API_BASE_URL}/finance/payments/update-bills`);
    console.log('Data being sent:', transactionData);

    const response = await fetch(`${API_BASE_URL}/finance/payments/update-bills`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const responseData = await response.json();
    console.log('Response data:', responseData);
    console.log('==============================');

    if (response.ok) {
      return { success: true, message: `Bills updated for apartment ${transactionData.apartment_number}` };
    } else {
      return { success: false, message: 'Failed to update bills' };
    }
  } catch (error) {
    console.error('Error updating bills:', error);
    return { success: false, message: 'Error updating bills' };
  }
}

