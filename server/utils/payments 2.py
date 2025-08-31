import requests


def get_payment_request(
    merchant_code,
    network_code,
    amount,
    callback_url,
    phone_number,
    token,
    transaction_desc="Request Payment",
    account_ref="12345678",
    currency="KES",
    transaction_fee=0,
):
    """
    Make a payment request to SasaPay API

    Args:
        merchant_code (str): Merchant code e.g. "600000"
        network_code (str): Network code e.g. "0"
        amount (str): Amount to charge e.g. "1.00"
        callback_url (str): URL to receive payment notification
        phone_number (str): Customer phone number e.g. "254700000000"
        transaction_desc (str, optional): Description. Defaults to "Request Payment"
        account_ref (str, optional): Account reference. Defaults to "12345678"
        currency (str, optional): Currency code. Defaults to "KES"
        transaction_fee (int, optional): Transaction fee. Defaults to 0
    """
    url = "https://sandbox.sasapay.app/api/v1/payments/request-payment/"

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "MerchantCode": merchant_code,
        "NetworkCode": network_code,
        "Transaction Fee": transaction_fee,
        "Currency": currency,
        "Amount": amount,
        "CallBackURL": callback_url,
        "PhoneNumber": phone_number,
        "TransactionDesc": transaction_desc,
        "AccountReference": account_ref,
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()


def payout_withdrawal(
    MerchantCode,
    MerchantTransactionReference,
    Amount,
    ReceiverNumber,
    Channel,
    Reason,
    CallBackURL,
    token,
    Currency="KES",
):
    url = "https://sandbox.sasapay.app/api/v1/payments/b2c/"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "MerchantCode": MerchantCode,
        "MerchantTransactionReference": MerchantTransactionReference,
        "Amount": Amount,
        "ReceiverNumber": ReceiverNumber,
        "Channel": Channel,
        "Reason": Reason,
        "CallBackURL": CallBackURL,
        "Currency": Currency,
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()


def pay_bills(
    token,
    merchantCode,
    transactionReference,
    amount,
    senderAccountNumber,
    receiverMerchantCode,
    accountReference,
    billerType,
    payment_method,
    reason,
    CallBackURL,
):
    url = "https://api.sasapay.app/api/v2/waas/payments/pay-bills/"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "merchantCode": merchantCode,
        "transactionReference": transactionReference,
        "currencyCode": "KES",
        "amount": amount,
        "senderAccountNumber": senderAccountNumber,
        "receiverMerchantCode": receiverMerchantCode,
        "accountReference": accountReference,
        "transactionFee": 0,
        "billerType": billerType,
        "networkCode": payment_method,
        "callbackUrl": CallBackURL,
        "reason": reason,
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.json()


def check_account_balance(
    merchant_code,
    token,
):
    url = f" https://sandbox.sasapay.app/api/v2/waas/merchant-balances/?merchantCode={merchant_code}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    response = requests.get(url, headers=headers)
    return response.json()


def submit_business_details(
    token,
    merchant_code,
    business_name,
    billNumber,
    description,
    productType,
    countryId,
    subregionId,
    industryId,
    subIndustryId,
    bankCode,
    bankAccountNumber,
    mobileNumber,
    businessTypeId,
    businessEmail,
    registrationNumber,
    KraPin,
    referralCode,
    dealerNumber,
    purpose,
    natureOfBusiness,
    physicalAddress,
    estimatedMonthlyTransactionAmount,
    estimatedMonthlyTransactionCount,
    CallbackUrl,
    directors,
):
    url = "https://sandbox.sasapay.app/api/v2/waas/business-onboarding/"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "merchantCode": merchant_code,
        "businessName": business_name,
        "billNumber": billNumber,
        "description": description,
        "productType": productType,
        "countryId": countryId,
        "subregionId": subregionId,
        "industryId": industryId,
        "subIndustryId": subIndustryId,
        "bankId": bankCode,
        "bankAccountNumber": bankAccountNumber,
        "mobileNumber": mobileNumber,
        "businessTypeId": businessTypeId,
        "email": businessEmail,
        "registrationNumber": registrationNumber,
        "kraPin": KraPin,
        "referralCode": referralCode,
        "dealerNumber": dealerNumber,
        "purpose": purpose,
        "natureOfBusiness": natureOfBusiness,
        "physicalAddress": physicalAddress,
        "estimatedMonthlyTransactionAmount": estimatedMonthlyTransactionAmount,
        "estimatedMonthlyTransactionCount": estimatedMonthlyTransactionCount,
        "callbackUrl": CallbackUrl,
        "directors": directors,
    }

    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    return response_data


def business_onboarding_confirmation(
    token,
    merchant_code,
    otp,
    requestId,
):
    """
    Confirm business onboarding with OTP verification.
    This is called after receiving the first response with OTP.
    """
    url = "https://sandbox.sasapay.app/api/v2/waas/business-onboarding/confirmation/"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "merchantCode": merchant_code,
        "otp": otp,
        "requestId": requestId,
    }

    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    return response_data


def submit_kyc_to_sasapay(
    token,
    merchantCode,
    requestId,
    businessKraPin,
    businessRegistrationCertificate,
    boardResolution,
    proofOfAddressDocument,
    proofOfBankDocument,
    cr12Document,
    taxComplianceCertificate,
    directorsKyc,
):
    """
    Submit KYC documents to SasaPay for business onboarding
    All document parameters should be file objects (not URLs)

    API expects this structure:
    {
        "merchantCode": "2612",
        "requestId": "41c54d28-5a84-4e8f-9b11-6e67ada0d983",
        "businessKraPin": "IMAGE.JPG",
        "businessRegistrationCertificate": "IMAGE.JPG",
        "boardResolution": "IMAGE.JPG",
        "cr12Document": "IMAGE.JPG",
        "proofOfAddressDocument": "IMAGE.JPG",
        "proofOfBankDocument": "IMAGE.JPG",
        "directorsKyc": [
            {
                "directorKraPinNumber": "A007774P",
                "directorIdCardFront": "IMAGE.JPG",
                "directorIdCardBack": "IMAGE.JPG",
                "directorKraPin": "IMAGE.JPG"
            }
        ]
    }
    """
    # Use the correct SasaPay KYC endpoint
    url = "https://sandbox.sasapay.app/api/v2/waas/business-onboarding/kyc/"

    # Validate required parameters
    if not token:
        return {"responseCode": "ERROR", "message": "Token is required"}
    if not merchantCode:
        return {"responseCode": "ERROR", "message": "Merchant code is required"}
    if not requestId:
        return {"responseCode": "ERROR", "message": "Request ID is required"}

    # Prepare multipart form data
    files = {}
    data = {
        "merchantCode": merchantCode,
        "requestId": requestId,
    }

    # Add company documents if they exist
    if businessKraPin:
        files["businessKraPin"] = businessKraPin
    if businessRegistrationCertificate:
        files["businessRegistrationCertificate"] = businessRegistrationCertificate
    if boardResolution:
        files["boardResolution"] = boardResolution
    if proofOfAddressDocument:
        files["proofOfAddressDocument"] = proofOfAddressDocument
    if proofOfBankDocument:
        files["proofOfBankDocument"] = proofOfBankDocument
    if cr12Document:
        files["cr12Document"] = cr12Document
    if taxComplianceCertificate:
        files["taxComplianceCertificate"] = taxComplianceCertificate

    # Add director KYC documents in the correct structure
    if directorsKyc:
        for i, director in enumerate(directorsKyc):
            # Add director files
            if director.get("directorIdCardFront"):
                files[f"directorsKyc[{i}][directorIdCardFront]"] = director[
                    "directorIdCardFront"
                ]
            if director.get("directorIdCardBack"):
                files[f"directorsKyc[{i}][directorIdCardBack]"] = director[
                    "directorIdCardBack"
                ]
            if director.get("directorKraPin"):
                files[f"directorsKyc[{i}][directorKraPin]"] = director["directorKraPin"]

            # director KRA PIN number to data (not files)
            if director.get("directorKraPinNumber"):
                data[f"directorsKyc[{i}][directorKraPinNumber]"] = director[
                    "directorKraPinNumber"
                ]

    # Validate we have at least some files to upload
    if not files:
        return {"responseCode": "ERROR", "message": "No documents to upload"}

    # Debug: Print what we're sending
    print(f"Files being sent: {list(files.keys())}")
    print(f"Data being sent: {data}")
    print(f"URL: {url}")
    print(f"Token: {token[:20]}..." if token else "No token")

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    response = requests.post(url, headers=headers, files=files, data=data, timeout=30)

    # Debug: Print the raw response details
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Text: {response.text}")
    print(f"Response Content: {response.content}")

    return response.json()
