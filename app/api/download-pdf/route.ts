import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Get session for authentication
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the backend URL from environment
    const backendUrl = process.env.API_BASE_URL || "http://localhost:8001";
    const downloadUrl = `${backendUrl}/finance/invoices/${invoiceId}/download-pdf`;

    console.log(`🔗 Proxying PDF download: ${downloadUrl}`);

    // Forward the request to the backend
    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/pdf",
      },
    });

    if (!response.ok) {
      console.error(
        `❌ Backend error: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: `Failed to download PDF: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the PDF blob
    const pdfBlob = await response.blob();

    console.log(`✅ PDF downloaded successfully: ${pdfBlob.size} bytes`);

    // Return the PDF with proper headers
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice_${invoiceId}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("❌ PDF download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
