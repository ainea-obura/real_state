"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

interface CountriesResponse {
  isError: boolean;
  data: Array<{
    id: string;
    name: string;
  }>;
}

interface CitiesResponse {
  isError: boolean;
  data: Array<{
    id: string;
    name: string;
    country_id: string;
  }>;
}

const API_BASE_URL = process.env.API_BASE_URL;

export async function getCountries(): Promise<CountriesResponse> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  try {
    const response = await fetch(`${API_BASE_URL}/geo/countries`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    
    return {
      isError: true,
      data: [],
    };
  }
}

export async function getCities(countryId: string): Promise<CitiesResponse> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  try {
    const response = await fetch(
      `${API_BASE_URL}/geo/cities?country_id=${countryId}`,
      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    
    return {
      isError: true,
      data: [],
    };
  }
}
