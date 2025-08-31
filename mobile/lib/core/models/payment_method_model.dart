class PaymentMethod {
  final String code;
  final String name;
  final bool forCollection;
  final bool working;
  final String type;

  PaymentMethod({
    required this.code,
    required this.name,
    required this.forCollection,
    required this.working,
    required this.type,
  });

  static List<PaymentMethod> get allPaymentMethods => [
    PaymentMethod(
      code: "63902",
      name: "MPesa",
      forCollection: false,
      working: true,
      type: "Mobile",
    ),
    PaymentMethod(
      code: "63903",
      name: "AirtelMoney",
      forCollection: false,
      working: true,
      type: "Mobile",
    ),
    PaymentMethod(
      code: "63907",
      name: "T-Kash",
      forCollection: false,
      working: true,
      type: "Mobile",
    ),
    PaymentMethod(
      code: "00",
      name: "SasaPay",
      forCollection: false,
      working: true,
      type: "Mobile",
    ),
    PaymentMethod(
      code: "paybill/buygoods",
      name: "Paybill/BuyGoods",
      forCollection: false,
      working: true,
      type: "Mobile",
    ),
    PaymentMethod(
      code: "cash",
      name: "Cash",
      forCollection: false,
      working: true,
      type: "Cash",
    ),
    PaymentMethod(
      code: "01",
      name: "KCB",
      forCollection: false,
      working: false,
      type: "Bank",
    ),
    PaymentMethod(
      code: "02",
      name: "Standard Chartered Bank KE",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "03",
      name: "Absa Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "07",
      name: "NCBA",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "10",
      name: "Prime Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "11",
      name: "Cooperative Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "12",
      name: "National Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "14",
      name: "M-Oriental",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "16",
      name: "Citibank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "18",
      name: "Middle East Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "19",
      name: "Bank of Africa",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "23",
      name: "Consolidated Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "25",
      name: "Credit Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "31",
      name: "Stanbic Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "35",
      name: "ABC Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "36",
      name: "Choice Microfinance Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "43",
      name: "Eco Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "50",
      name: "Paramount Universal Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "51",
      name: "Kingdom Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "53",
      name: "Guaranty Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "54",
      name: "Victoria Commercial Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "55",
      name: "Guardian Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "57",
      name: "I&M Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "61",
      name: "HFC Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "63",
      name: "DTB",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "65",
      name: "Mayfair Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "66",
      name: "Sidian Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "68",
      name: "Equity Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "70",
      name: "Family Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "72",
      name: "Gulf African Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "74",
      name: "First Community Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "75",
      name: "DIB Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "76",
      name: "UBA",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "78",
      name: "KWFT Bank",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "89",
      name: "Stima Sacco",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
    PaymentMethod(
      code: "97",
      name: "Telcom Kenya",
      forCollection: false,
      working: true,
      type: "Bank",
    ),
  ];

  static List<PaymentMethod> get workingPaymentMethods =>
      allPaymentMethods.where((method) => method.working).toList();

  static List<PaymentMethod> getBankMethods() {
    return allPaymentMethods
        .where((method) => method.type == "Bank" && method.working)
        .toList();
  }

  static List<PaymentMethod> getMobileMethods() {
    return allPaymentMethods
        .where((method) => method.type == "Mobile" && method.working)
        .toList();
  }

  static List<PaymentMethod> getCashMethods() {
    return allPaymentMethods
        .where((method) => method.type == "Cash" && method.working)
        .toList();
  }
}
