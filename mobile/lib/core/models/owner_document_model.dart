class OwnerDocument {
  final String id;
  final String documentType;
  final String documentName;
  final String? description;
  final String status; // pending, approved, rejected
  final String? fileUrl;
  final String? fileName;
  final String? fileSize;
  final String? mimeType;
  final DateTime? uploadedAt;
  final DateTime? reviewedAt;
  final String? reviewedBy;
  final String? rejectionReason;
  final String? propertyId;
  final String? propertyName;
  final String? unitId;
  final String? unitName;

  const OwnerDocument({
    required this.id,
    required this.documentType,
    required this.documentName,
    this.description,
    required this.status,
    this.fileUrl,
    this.fileName,
    this.fileSize,
    this.mimeType,
    this.uploadedAt,
    this.reviewedAt,
    this.reviewedBy,
    this.rejectionReason,
    this.propertyId,
    this.propertyName,
    this.unitId,
    this.unitName,
  });

  factory OwnerDocument.fromJson(Map<String, dynamic> json) {
    return OwnerDocument(
      id: json['id']?.toString() ?? '',
      documentType:
          json['document_type']?.toString() ??
          json['documentType']?.toString() ??
          '',
      documentName:
          json['document_name']?.toString() ??
          json['documentName']?.toString() ??
          '',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      fileUrl: json['file_url']?.toString() ?? json['fileUrl']?.toString(),
      fileName: json['file_name']?.toString() ?? json['fileName']?.toString(),
      fileSize: json['file_size']?.toString() ?? json['fileSize']?.toString(),
      mimeType: json['mime_type']?.toString() ?? json['mimeType']?.toString(),
      uploadedAt: json['uploaded_at'] != null
          ? DateTime.tryParse(json['uploaded_at'].toString())
          : null,
      reviewedAt: json['reviewed_at'] != null
          ? DateTime.tryParse(json['reviewed_at'].toString())
          : null,
      reviewedBy:
          json['reviewed_by']?.toString() ?? json['reviewedBy']?.toString(),
      rejectionReason:
          json['rejection_reason']?.toString() ??
          json['rejectionReason']?.toString(),
      propertyId:
          json['property_id']?.toString() ?? json['propertyId']?.toString(),
      propertyName:
          json['property_name']?.toString() ?? json['propertyName']?.toString(),
      unitId: json['unit_id']?.toString() ?? json['unitId']?.toString(),
      unitName: json['unit_name']?.toString() ?? json['unitName']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'document_type': documentType,
      'document_name': documentName,
      'description': description,
      'status': status,
      'file_url': fileUrl,
      'file_name': fileName,
      'file_size': fileSize,
      'mime_type': mimeType,
      'uploaded_at': uploadedAt?.toIso8601String(),
      'reviewed_at': reviewedAt?.toIso8601String(),
      'reviewed_by': reviewedBy,
      'rejection_reason': rejectionReason,
      'property_id': propertyId,
      'property_name': propertyName,
      'unit_id': unitId,
      'unit_name': unitName,
    };
  }

  // Helper getters
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isRejected => status.toLowerCase() == 'rejected';

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  String get documentTypeDisplay {
    switch (documentType.toLowerCase()) {
      case 'property_deed':
        return 'Property Deed';
      case 'ownership_certificate':
        return 'Ownership Certificate';
      case 'tax_assessment':
        return 'Tax Assessment';
      case 'insurance_policy':
        return 'Insurance Policy';
      case 'maintenance_record':
        return 'Maintenance Record';
      case 'rental_agreement':
        return 'Rental Agreement';
      case 'tenant_contract':
        return 'Tenant Contract';
      case 'financial_statement':
        return 'Financial Statement';
      case 'utility_bill':
        return 'Utility Bill';
      case 'other':
        return 'Other Document';
      default:
        return documentType;
    }
  }

  String get fileSizeDisplay {
    if (fileSize == null) return 'Unknown';

    try {
      final size = int.parse(fileSize!);
      if (size < 1024) {
        return '$size B';
      } else if (size < 1024 * 1024) {
        return '${(size / 1024).toStringAsFixed(1)} KB';
      } else {
        return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
      }
    } catch (e) {
      return fileSize!;
    }
  }

  String get uploadedDateDisplay {
    if (uploadedAt == null) return 'Unknown';
    return '${uploadedAt!.day}/${uploadedAt!.month}/${uploadedAt!.year}';
  }

  String get reviewedDateDisplay {
    if (reviewedAt == null) return 'Not reviewed';
    return '${reviewedAt!.day}/${reviewedAt!.month}/${reviewedAt!.year}';
  }

  String get propertyDisplay {
    if (propertyName != null && unitName != null) {
      return '$propertyName - $unitName';
    } else if (propertyName != null) {
      return propertyName!;
    } else if (unitName != null) {
      return unitName!;
    }
    return 'Unknown Property';
  }
}

class OwnerDocumentsResponse {
  final List<OwnerDocument> documents;
  final int total;
  final int page;
  final bool hasNext;

  const OwnerDocumentsResponse({
    required this.documents,
    required this.total,
    required this.page,
    required this.hasNext,
  });

  factory OwnerDocumentsResponse.fromJson(Map<String, dynamic> json) {
    final List<dynamic> documentsData = json['data'] ?? [];
    final documents = documentsData
        .map((documentJson) => OwnerDocument.fromJson(documentJson))
        .toList();

    return OwnerDocumentsResponse(
      documents: documents,
      total: json['total'] ?? 0,
      page: json['page'] ?? 1,
      hasNext: json['has_next'] ?? false,
    );
  }
}
