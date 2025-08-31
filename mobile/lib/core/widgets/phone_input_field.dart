import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';

class PhoneInputField extends StatefulWidget {
  final String? initialCountryCode;
  final String? initialPhoneNumber;
  final Function(String countryCode, String phoneNumber)? onChanged;
  final String? Function(String?)? validator;
  final bool enabled;

  const PhoneInputField({
    super.key,
    this.initialCountryCode = '+1',
    this.initialPhoneNumber,
    this.onChanged,
    this.validator,
    this.enabled = true,
  });

  @override
  State<PhoneInputField> createState() => _PhoneInputFieldState();
}

class _PhoneInputFieldState extends State<PhoneInputField> {
  late String _selectedCountryCode;
  final TextEditingController _phoneController = TextEditingController();

  final List<CountryCode> _countryCodes = [
    CountryCode('🇺🇸', 'US', '+1'),
    CountryCode('🇬🇧', 'UK', '+44'),
    CountryCode('🇨🇦', 'CA', '+1'),
    CountryCode('🇦🇺', 'AU', '+61'),
    CountryCode('🇩🇪', 'DE', '+49'),
    CountryCode('🇫🇷', 'FR', '+33'),
    CountryCode('🇮🇹', 'IT', '+39'),
    CountryCode('🇪🇸', 'ES', '+34'),
    CountryCode('🇳🇱', 'NL', '+31'),
    CountryCode('🇧🇪', 'BE', '+32'),
    CountryCode('🇸🇪', 'SE', '+46'),
    CountryCode('🇳🇴', 'NO', '+47'),
    CountryCode('🇩🇰', 'DK', '+45'),
    CountryCode('🇫🇮', 'FI', '+358'),
    CountryCode('🇮🇳', 'IN', '+91'),
    CountryCode('🇨🇳', 'CN', '+86'),
    CountryCode('🇯🇵', 'JP', '+81'),
    CountryCode('🇰🇷', 'KR', '+82'),
    CountryCode('🇧🇷', 'BR', '+55'),
    CountryCode('🇲🇽', 'MX', '+52'),
    CountryCode('🇦🇷', 'AR', '+54'),
    CountryCode('🇿🇦', 'ZA', '+27'),
    CountryCode('🇳🇬', 'NG', '+234'),
    CountryCode('🇰🇪', 'KE', '+254'),
    CountryCode('🇪🇬', 'EG', '+20'),
    CountryCode('🇦🇪', 'AE', '+971'),
    CountryCode('🇸🇦', 'SA', '+966'),
    CountryCode('🇮🇱', 'IL', '+972'),
    CountryCode('🇹🇷', 'TR', '+90'),
    CountryCode('🇷🇺', 'RU', '+7'),
  ];

  @override
  void initState() {
    super.initState();
    _selectedCountryCode = widget.initialCountryCode ?? '+1';
    if (widget.initialPhoneNumber != null) {
      _phoneController.text = widget.initialPhoneNumber!;
    }

    _phoneController.addListener(() {
      if (widget.onChanged != null) {
        widget.onChanged!(_selectedCountryCode, _phoneController.text);
      }
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Phone Number',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            // Country Code Dropdown
            GestureDetector(
              onTap: widget.enabled ? _showCountryPicker : null,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(8),
                    bottomLeft: Radius.circular(8),
                  ),
                  color: widget.enabled
                      ? AppColors.surface
                      : AppColors.surfaceVariant,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _getCountryFlag(_selectedCountryCode),
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _selectedCountryCode,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.keyboard_arrow_down_rounded,
                      size: 16,
                      color: widget.enabled
                          ? AppColors.textSecondary
                          : AppColors.textDisabled,
                    ),
                  ],
                ),
              ),
            ),

            // Phone Number Input
            Expanded(
              child: TextFormField(
                controller: _phoneController,
                enabled: widget.enabled,
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(15),
                ],
                validator: widget.validator,
                decoration: InputDecoration(
                  hintText: 'Enter phone number',
                  hintStyle: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                    borderSide: const BorderSide(
                      color: AppColors.primary,
                      width: 2,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                    borderSide: const BorderSide(color: AppColors.error),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                    borderSide: const BorderSide(
                      color: AppColors.error,
                      width: 2,
                    ),
                  ),
                  filled: true,
                  fillColor: widget.enabled
                      ? AppColors.surface
                      : AppColors.surfaceVariant,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 14,
                  ),
                ),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _getCountryFlag(String countryCode) {
    final country = _countryCodes.firstWhere(
      (c) => c.code == countryCode,
      orElse: () => _countryCodes.first,
    );
    return country.flag;
  }

  void _showCountryPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Select Country',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: _countryCodes.length,
                itemBuilder: (context, index) {
                  final country = _countryCodes[index];
                  final isSelected = country.code == _selectedCountryCode;

                  return ListTile(
                    leading: Text(
                      country.flag,
                      style: const TextStyle(fontSize: 20),
                    ),
                    title: Text(
                      '${country.name} (${country.code})',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.textPrimary,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(
                            Icons.check_rounded,
                            color: AppColors.primary,
                            size: 20,
                          )
                        : null,
                    onTap: () {
                      setState(() {
                        _selectedCountryCode = country.code;
                      });
                      if (widget.onChanged != null) {
                        widget.onChanged!(
                          _selectedCountryCode,
                          _phoneController.text,
                        );
                      }
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CountryCode {
  final String flag;
  final String name;
  final String code;

  CountryCode(this.flag, this.name, this.code);
}
