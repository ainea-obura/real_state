import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../core/services/api_service.dart';
import '../../core/controllers/auth_controller.dart';
import '../../core/utils/toast_utils.dart';

class VerificationDocumentsScreen extends StatefulWidget {
  final String userType; // 'owner' or 'tenant'

  const VerificationDocumentsScreen({
    super.key,
    this.userType = 'owner', // Default to owner for backward compatibility
  });

  @override
  State<VerificationDocumentsScreen> createState() =>
      _VerificationDocumentsScreenState();
}

class _VerificationDocumentsScreenState
    extends State<VerificationDocumentsScreen> {
  // Real API data
  List<VerificationDocument> documents = [];
  bool isLoading = false;
  bool needsDocument = true;
  String? errorMessage;

  late AuthController _authController;

  // Tab management
  int selectedTabIndex = 0;
  final List<String> tabs = [
    'All',
    'Pending',
    'Approved',
    'Rejected',
    'Expired',
  ];

  @override
  void initState() {
    super.initState();
    print('🔍 VerificationDocumentsScreen: initState called');
    try {
      _authController = Get.find<AuthController>();
      print(
        '🔍 VerificationDocumentsScreen: AuthController found successfully',
      );
      _loadDocuments();

      // Add a safety timeout to prevent infinite loading
      Future.delayed(const Duration(seconds: 35), () {
        if (mounted && isLoading) {
          print(
            '⚠️ VerificationDocumentsScreen: Loading timeout reached, showing error',
          );
          setState(() {
            errorMessage =
                'Loading timeout - please check your connection and try again';
            isLoading = false;
          });
        }
      });
    } catch (e) {
      print('❌ VerificationDocumentsScreen: Failed to find AuthController: $e');
      setState(() {
        errorMessage = 'Failed to initialize: $e';
        isLoading = false;
      });
    }
  }

  Future<void> _loadDocuments() async {
    print('🔍 VerificationDocumentsScreen: Starting _loadDocuments');
    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      print('🔍 VerificationDocumentsScreen: Getting user data');
      final userData = _authController.currentUser;
      print('🔍 VerificationDocumentsScreen: User data: $userData');

      if (userData == null) {
        print('❌ VerificationDocumentsScreen: User data is null');
        setState(() {
          errorMessage = 'User data not available';
          isLoading = false;
        });
        return;
      }

      print('🔍 VerificationDocumentsScreen: User ID: ${userData.id}');
      print('🔍 VerificationDocumentsScreen: Calling API...');

      final result = await ApiService().getVerificationDocuments(
        userData.id,
        widget.userType, // Use the userType from widget
      );

      print('🔍 VerificationDocumentsScreen: API result: $result');
      print(
        '🔍 VerificationDocumentsScreen: API result type: ${result.runtimeType}',
      );
      print(
        '🔍 VerificationDocumentsScreen: API result keys: ${result.keys.toList()}',
      );

      if (result['success']) {
        final data = result['data'];
        print('🔍 VerificationDocumentsScreen: Data: $data');
        print('🔍 VerificationDocumentsScreen: Data type: ${data.runtimeType}');
        print(
          '🔍 VerificationDocumentsScreen: Data keys: ${data.keys.toList()}',
        );

        // The API response has double nesting: data.data.verifications
        final actualData = data['data'] ?? data;
        print('🔍 VerificationDocumentsScreen: Actual data: $actualData');
        print(
          '🔍 VerificationDocumentsScreen: Actual data keys: ${actualData.keys.toList()}',
        );

        final verifications = actualData['verifications'] ?? [];
        final needsDoc = actualData['needs_document'] ?? false;

        print(
          '🔍 VerificationDocumentsScreen: Verifications count: ${verifications.length}',
        );
        print('🔍 VerificationDocumentsScreen: Verifications: $verifications');
        print('🔍 VerificationDocumentsScreen: Needs document: $needsDoc');

        setState(() {
          documents = verifications.map<VerificationDocument>((doc) {
            return VerificationDocument(
              id: doc['id'] ?? '',
              category: doc['category'] ?? '',
              idNumber: doc['id_number'] ?? '',
              documentImageUrl: doc['document_image'] ?? '',
              userImageUrl: doc['user_image'],
              status: doc['status'] ?? 'pending',
              updatedAt: doc['updated_at'] ?? doc['created_at'] ?? '',
              reason: doc['reason'],
            );
          }).toList();
          needsDocument = needsDoc;
          isLoading = false;
        });
        print('✅ VerificationDocumentsScreen: Documents loaded successfully');
      } else {
        print('❌ VerificationDocumentsScreen: API failed: ${result['error']}');
        setState(() {
          errorMessage = result['error'] ?? 'Failed to load documents';
          isLoading = false;
        });
      }
    } catch (e) {
      print('❌ VerificationDocumentsScreen: Exception caught: $e');
      setState(() {
        errorMessage = 'Error loading documents: $e';
        isLoading = false;
      });
    }
  }

  List<VerificationDocument> get filteredDocuments {
    if (selectedTabIndex == 0) return documents;
    String status = tabs[selectedTabIndex].toLowerCase();
    return documents.where((doc) => doc.status == status).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Verification Documents',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(
              isLoading ? Icons.refresh : Icons.refresh_outlined,
              color: AppColors.textPrimary,
            ),
            onPressed: isLoading ? null : _loadDocuments,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Tab Bar
          Container(
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: tabs.asMap().entries.map((entry) {
                  int index = entry.key;
                  String label = entry.value;
                  bool isSelected = selectedTabIndex == index;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        selectedTabIndex = index;
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey[600],
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadDocuments,
              color: AppColors.primary,
              child: isLoading
                  ? _buildLoadingState()
                  : errorMessage != null
                  ? _buildErrorState()
                  : documents.isEmpty && _canUploadDocument()
                  ? _buildEmptyState()
                  : filteredDocuments.isEmpty
                  ? _buildNoDocumentsInCategory()
                  : Column(
                      children: [
                        // Status Summary
                        if (documents.isNotEmpty) _buildStatusSummary(),
                        // Documents List
                        Expanded(child: _buildDocumentsList()),
                      ],
                    ),
            ),
          ),
        ],
      ),
      floatingActionButton: _canUploadDocument()
          ? FloatingActionButton.extended(
              onPressed: _showUploadModal,
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.upload, color: Colors.white),
              label: const Text(
                'Upload Document',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            )
          : null,
    );
  }

  bool _hasPendingDocument() {
    return documents.any((doc) => doc.status == 'pending');
  }

  bool _hasApprovedDocument() {
    return documents.any((doc) => doc.status == 'approved');
  }

  bool _canUploadDocument() {
    // Can upload if:
    // 1. No documents exist, OR
    // 2. No approved documents exist, AND
    // 3. No pending documents exist
    // 4. AND backend says user needs document
    return (documents.isEmpty ||
            (!_hasApprovedDocument() && !_hasPendingDocument())) &&
        needsDocument;
  }

  Widget _buildLoadingState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            const SizedBox(height: 24),
            Text(
              'Loading Verification Documents...',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Please wait while we fetch your documents',
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: _loadDocuments,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      isLoading = false;
                      errorMessage = null;
                    });
                    _loadDocuments();
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Force Refresh'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 80, color: Colors.red[400]),
            const SizedBox(height: 24),
            Text(
              'Error Loading Documents',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              errorMessage ?? 'An error occurred while loading documents.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: _loadDocuments,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try Again'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      errorMessage = null;
                      isLoading = false;
                    });
                    _loadDocuments();
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Clear & Retry'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.upload_rounded, size: 80, color: Colors.grey[400]),
            const SizedBox(height: 24),
            Text(
              'No Verification Documents',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Upload your identity document to get started with verification.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            if (_canUploadDocument()) ...[
              ElevatedButton.icon(
                onPressed: _showUploadModal,
                icon: const Icon(Icons.upload),
                label: const Text('Upload Document'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange[200]!),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: Colors.orange[600],
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Document verification in progress',
                      style: TextStyle(
                        color: Colors.orange[700],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNoDocumentsInCategory() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_open_rounded, size: 80, color: Colors.grey[400]),
            const SizedBox(height: 24),
            Text(
              'No Documents in This Category',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'There are no ${tabs[selectedTabIndex].toLowerCase()} documents.',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusSummary() {
    final hasPending = _hasPendingDocument();
    final hasApproved = _hasApprovedDocument();
    final canUpload = _canUploadDocument();

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                hasApproved ? Icons.check_circle : Icons.info_outline,
                color: hasApproved ? Colors.green[600] : Colors.blue[600],
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Verification Status',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: Icon(
                  isLoading ? Icons.refresh : Icons.refresh_outlined,
                  color: AppColors.primary,
                  size: 20,
                ),
                onPressed: isLoading ? null : _loadDocuments,
                tooltip: 'Refresh',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (hasApproved)
            Text(
              '✅ You have an approved verification document',
              style: TextStyle(
                color: Colors.green[700],
                fontWeight: FontWeight.w500,
              ),
            )
          else if (hasPending)
            Text(
              '⏳ Your verification document is pending review',
              style: TextStyle(
                color: Colors.orange[700],
                fontWeight: FontWeight.w500,
              ),
            )
          else
            Text(
              '📝 No verification documents found',
              style: TextStyle(
                color: Colors.grey[700],
                fontWeight: FontWeight.w500,
              ),
            ),
          const SizedBox(height: 8),
          if (!canUpload)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange[600], size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      hasPending
                          ? 'Upload disabled: Please wait for current document review'
                          : 'Upload disabled: You already have an approved document',
                      style: TextStyle(color: Colors.orange[700], fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDocumentsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredDocuments.length,
      itemBuilder: (context, index) {
        final doc = filteredDocuments[index];
        return _buildDocumentCard(doc);
      },
    );
  }

  Widget _buildDocumentCard(VerificationDocument doc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                _buildStatusBadge(doc.status),
                const Spacer(),
                Text(
                  doc.updatedAt,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getCategoryLabel(doc.category),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'ID: ${doc.idNumber}',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
                const SizedBox(height: 16),

                // Images Row
                Row(
                  children: [
                    // Document Image
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            'Document',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: 120,
                            height: 80,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey[300]!),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                doc.documentImageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    color: Colors.grey[200],
                                    child: Icon(
                                      Icons.image_not_supported,
                                      color: Colors.grey[400],
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 16),

                    // User Image
                    Column(
                      children: [
                        Text(
                          'Face',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(color: Colors.grey[300]!),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(30),
                            child: doc.userImageUrl != null
                                ? Image.network(
                                    doc.userImageUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Container(
                                        color: Colors.grey[200],
                                        child: Icon(
                                          Icons.person,
                                          color: Colors.grey[400],
                                        ),
                                      );
                                    },
                                  )
                                : Container(
                                    color: Colors.grey[200],
                                    child: Icon(
                                      Icons.person,
                                      color: Colors.grey[400],
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Rejection Reason
                if (doc.status == 'rejected' && doc.reason != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red[50]!,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: Colors.red[600],
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            doc.reason!,
                            style: TextStyle(
                              color: Colors.red[700],
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color badgeColor;
    Color textColor;
    IconData icon;
    String label;

    switch (status) {
      case 'approved':
        badgeColor = Colors.green[100]!;
        textColor = Colors.green[700]!;
        icon = Icons.check_circle;
        label = 'Approved';
        break;
      case 'pending':
        badgeColor = Colors.orange[100]!;
        textColor = Colors.orange[700]!;
        icon = Icons.schedule;
        label = 'Pending';
        break;
      case 'rejected':
        badgeColor = Colors.red[100]!;
        textColor = Colors.red[700]!;
        icon = Icons.cancel;
        label = 'Rejected';
        break;
      case 'expired':
        badgeColor = Colors.grey[100]!;
        textColor = Colors.grey[700]!;
        icon = Icons.archive;
        label = 'Expired';
        break;
      default:
        badgeColor = Colors.grey[100]!;
        textColor = Colors.grey[700]!;
        icon = Icons.help;
        label = 'Unknown';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  String _getCategoryLabel(String category) {
    switch (category) {
      case 'passport':
        return 'Passport';
      case 'national_id':
        return 'National ID Card';
      case 'driver_license':
        return 'Driver\'s License';
      case 'residence_permit':
        return 'Residence Permit';
      case 'other':
        return 'Other';
      default:
        return 'Unknown Document';
    }
  }

  void _showUploadModal() async {
    final result = await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => VerificationUploadModal(userType: widget.userType),
    );

    // Refresh documents if upload was successful
    if (result == true) {
      _loadDocuments();
    }
  }
}

class VerificationUploadModal extends StatefulWidget {
  final String userType; // 'owner' or 'tenant'

  const VerificationUploadModal({super.key, required this.userType});

  @override
  State<VerificationUploadModal> createState() =>
      _VerificationUploadModalState();
}

class _VerificationUploadModalState extends State<VerificationUploadModal> {
  String selectedCategory = 'passport';
  final TextEditingController idNumberController = TextEditingController();
  File? documentImage;
  File? userImage;
  bool isUploading = false;

  final List<Map<String, String>> categories = [
    {'value': 'passport', 'label': 'Passport'},
    {'value': 'national_id', 'label': 'National ID Card'},
    {'value': 'driver_license', 'label': 'Driver\'s License'},
    {'value': 'residence_permit', 'label': 'Residence Permit'},
    {'value': 'other', 'label': 'Other'},
  ];

  @override
  void dispose() {
    idNumberController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source, bool isDocument) async {
    try {
      final XFile? image = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (image != null) {
        setState(() {
          if (isDocument) {
            documentImage = File(image.path);
          } else {
            userImage = File(image.path);
          }
        });
      }
    } catch (e) {
      ToastUtils.showError('Error picking image: $e');
    }
  }

  void _showImagePickerDialog(bool isDocument) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Select ${isDocument ? 'Document' : 'Face'} Image'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Camera'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera, isDocument);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery, isDocument);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _uploadDocument() async {
    if (selectedCategory.isEmpty ||
        idNumberController.text.isEmpty ||
        documentImage == null) {
      ToastUtils.showError(
        'Please fill all required fields and select a document image',
      );
      return;
    }

    setState(() {
      isUploading = true;
    });

    try {
      final authController = Get.find<AuthController>();
      final userData = authController.currentUser;

      if (userData == null) {
        throw Exception('User data not available');
      }

      print('🔍 Upload: Starting document upload');
      print('🔍 Upload: User ID: ${userData.id}');
      print('🔍 Upload: Category: $selectedCategory');
      print('🔍 Upload: ID Number: ${idNumberController.text}');
      print('🔍 Upload: Document Image: ${documentImage?.path}');
      print('🔍 Upload: User Image: ${userImage?.path}');

      final result = await ApiService().uploadVerificationDocument(
        userId: userData.id,
        userType: widget.userType, // Use the userType from widget
        category: selectedCategory,
        idNumber: idNumberController.text,
        documentImage: documentImage!,
        userImage: userImage,
      );

      print('🔍 Upload: API result: $result');
      print('🔍 Upload: Success: ${result['success']}');
      print('🔍 Upload: Error: ${result['error']}');

      if (result['success']) {
        // Show success toast and close modal
        ToastUtils.showSuccess('Document uploaded successfully!');

        // Close the modal and return true to trigger refresh
        Navigator.pop(context, true);
      } else {
        throw Exception(result['error'] ?? 'Upload failed');
      }
    } catch (e) {
      ToastUtils.showError('Upload failed: $e');
    } finally {
      setState(() {
        isUploading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Icon(Icons.upload_rounded, size: 48, color: AppColors.primary),
                const SizedBox(height: 16),
                const Text(
                  'Upload Verification Document',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Upload your identity document and optionally a face photo for verification.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                ),
              ],
            ),
          ),

          // Form
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Document Type
                  const Text(
                    'Document Type',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedCategory,
                        isExpanded: true,
                        items: categories.map((category) {
                          return DropdownMenuItem<String>(
                            value: category['value'],
                            child: Text(category['label']!),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            selectedCategory = value!;
                          });
                        },
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Document ID
                  const Text(
                    'Document ID',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: idNumberController,
                    decoration: InputDecoration(
                      hintText: 'Enter document ID number',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.primary),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Document Image
                  const Text(
                    'Document Image *',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => _showImagePickerDialog(true),
                    child: Container(
                      width: double.infinity,
                      height: 120,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: documentImage != null
                              ? AppColors.primary
                              : Colors.grey[300]!,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        color: Colors.grey[50],
                      ),
                      child: documentImage != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(
                                documentImage!,
                                fit: BoxFit.cover,
                              ),
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.add_photo_alternate,
                                  size: 40,
                                  color: Colors.grey[400],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Tap to select document image',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Face Image (Optional)
                  const Text(
                    'Face Photo (Optional)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => _showImagePickerDialog(false),
                    child: Container(
                      width: double.infinity,
                      height: 120,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: userImage != null
                              ? AppColors.primary
                              : Colors.grey[300]!,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        color: Colors.grey[50],
                      ),
                      child: userImage != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(userImage!, fit: BoxFit.cover),
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.person_add,
                                  size: 40,
                                  color: Colors.grey[400],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Tap to select face photo',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),

          // Action Buttons
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isUploading
                        ? null
                        : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Cancel', style: TextStyle(fontSize: 16)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isUploading ? null : _uploadDocument,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: isUploading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : const Text(
                            'Upload',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class VerificationDocument {
  final String id;
  final String category;
  final String idNumber;
  final String documentImageUrl;
  final String? userImageUrl;
  final String status;
  final String updatedAt;
  final String? reason;

  VerificationDocument({
    required this.id,
    required this.category,
    required this.idNumber,
    required this.documentImageUrl,
    this.userImageUrl,
    required this.status,
    required this.updatedAt,
    this.reason,
  });
}
