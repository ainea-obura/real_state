/// Utility functions for payment method mapping and validation
class PaymentMethodUtils {
  /// Map account type and bank name to the correct payment method code expected by the backend
  ///
  /// This maps user account information to standardized payment method codes
  /// that the backend expects for payment history and reporting.
  static String mapAccountTypeToPaymentMethod({
    required String accountType,
    required String bankName,
    String? fallbackCode,
  }) {
    final lowerAccountType = accountType.toLowerCase();
    final lowerBankName = bankName.toLowerCase();

    // Mobile money providers
    if (lowerAccountType == 'mobile') {
      if (lowerBankName.contains('mpesa') ||
          lowerBankName.contains('safaricom')) {
        return '63902'; // MPesa
      } else if (lowerBankName.contains('airtel')) {
        return '63903'; // AirtelMoney
      } else if (lowerBankName.contains('telkom') ||
          lowerBankName.contains('tkash')) {
        return '63907'; // T-Kash
      }
    }

    // Bank providers - map common bank names to their codes
    if (lowerAccountType == 'bank') {
      if (lowerBankName.contains('equity')) {
        return '68'; // Equity Bank
      } else if (lowerBankName.contains('kcb')) {
        return '01'; // KCB
      } else if (lowerBankName.contains('cooperative')) {
        return '11'; // Cooperative Bank
      } else if (lowerBankName.contains('absa')) {
        return '03'; // Absa Bank
      } else if (lowerBankName.contains('ncba')) {
        return '07'; // NCBA
      } else if (lowerBankName.contains('standard chartered')) {
        return '02'; // Standard Chartered Bank KE
      } else if (lowerBankName.contains('dtb')) {
        return '63'; // DTB
      } else if (lowerBankName.contains('i&m') ||
          lowerBankName.contains('i&m')) {
        return '57'; // I&M Bank
      } else if (lowerBankName.contains('family')) {
        return '70'; // Family Bank
      } else if (lowerBankName.contains('gulf african')) {
        return '72'; // Gulf African Bank
      } else if (lowerBankName.contains('prime')) {
        return '10'; // Prime Bank
      } else if (lowerBankName.contains('national')) {
        return '12'; // National Bank
      } else if (lowerBankName.contains('citibank')) {
        return '16'; // Citibank
      } else if (lowerBankName.contains('stanbic')) {
        return '31'; // Stanbic Bank
      } else if (lowerBankName.contains('abc')) {
        return '35'; // ABC Bank
      } else if (lowerBankName.contains('eco')) {
        return '43'; // Eco Bank
      } else if (lowerBankName.contains('kingdom')) {
        return '51'; // Kingdom Bank
      } else if (lowerBankName.contains('guaranty')) {
        return '53'; // Guaranty Bank
      } else if (lowerBankName.contains('victoria')) {
        return '54'; // Victoria Commercial Bank
      } else if (lowerBankName.contains('guardian')) {
        return '55'; // Guardian Bank
      } else if (lowerBankName.contains('hfc')) {
        return '61'; // HFC Bank
      } else if (lowerBankName.contains('mayfair')) {
        return '65'; // Mayfair Bank
      } else if (lowerBankName.contains('sidian')) {
        return '66'; // Sidian Bank
      } else if (lowerBankName.contains('uba')) {
        return '76'; // UBA
      } else if (lowerBankName.contains('kwft')) {
        return '78'; // KWFT Bank
      } else if (lowerBankName.contains('stima')) {
        return '89'; // Stima Sacco
      }
    }

    // Default fallback - use the provided fallback code or return empty
    return fallbackCode ?? '';
  }

  /// Get a human-readable payment method name from the payment method code
  static String getPaymentMethodName(String paymentMethodCode) {
    switch (paymentMethodCode) {
      case '63902':
        return 'MPesa';
      case '63903':
        return 'AirtelMoney';
      case '63907':
        return 'T-Kash';
      case '00':
        return 'SasaPay';
      case '01':
        return 'KCB';
      case '02':
        return 'Standard Chartered Bank KE';
      case '03':
        return 'Absa Bank';
      case '07':
        return 'NCBA';
      case '10':
        return 'Prime Bank';
      case '11':
        return 'Cooperative Bank';
      case '12':
        return 'National Bank';
      case '14':
        return 'M-Oriental';
      case '16':
        return 'Citibank';
      case '18':
        return 'Middle East Bank';
      case '19':
        return 'Bank of Africa';
      case '23':
        return 'Consolidated Bank';
      case '25':
        return 'Credit Bank';
      case '31':
        return 'Stanbic Bank';
      case '35':
        return 'ABC Bank';
      case '36':
        return 'Choice Microfinance Bank';
      case '43':
        return 'Eco Bank';
      case '50':
        return 'Paramount Universal Bank';
      case '51':
        return 'Kingdom Bank';
      case '53':
        return 'Guaranty Bank';
      case '54':
        return 'Victoria Commercial Bank';
      case '55':
        return 'Guardian Bank';
      case '57':
        return 'I&M Bank';
      case '61':
        return 'HFC Bank';
      case '63':
        return 'DTB';
      case '65':
        return 'Mayfair Bank';
      case '66':
        return 'Sidian Bank';
      case '68':
        return 'Equity Bank';
      case '70':
        return 'Family Bank';
      case '72':
        return 'Gulf African Bank';
      case '74':
        return 'First Community Bank';
      case '75':
        return 'DIB Bank';
      case '76':
        return 'UBA';
      case '78':
        return 'KWFT Bank';
      case '89':
        return 'Stima Sacco';
      case '97':
        return 'Telcom Kenya';
      default:
        return 'Unknown Payment Method';
    }
  }

  /// Check if a payment method code is valid
  static bool isValidPaymentMethodCode(String code) {
    final validCodes = [
      '63902', '63903', '63907', // Mobile money
      '00',
      '01',
      '02',
      '03',
      '07',
      '10',
      '11',
      '12',
      '14',
      '16',
      '18',
      '19', // Banks
      '23',
      '25',
      '31',
      '35',
      '36',
      '43',
      '50',
      '51',
      '53',
      '54',
      '55',
      '57', // More banks
      '61',
      '63',
      '65',
      '66',
      '68',
      '70',
      '72',
      '74',
      '75',
      '76',
      '78',
      '89',
      '97', // More banks
    ];
    return validCodes.contains(code);
  }

  /// Get payment method category (mobile, bank, other)
  static String getPaymentMethodCategory(String paymentMethodCode) {
    if (paymentMethodCode.startsWith('639')) {
      return 'mobile';
    } else if (paymentMethodCode.length <= 2) {
      return 'bank';
    } else {
      return 'other';
    }
  }
}
