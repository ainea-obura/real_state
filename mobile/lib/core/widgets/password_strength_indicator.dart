import 'dart:math';
import 'package:flutter/material.dart';

class PasswordStrengthIndicator extends StatelessWidget {
  final String password;
  final bool isCompact;

  const PasswordStrengthIndicator({
    super.key,
    required this.password,
    this.isCompact = true,
  });

  @override
  Widget build(BuildContext context) {
    final strength = _getPasswordStrength(password);

    if (password.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Strength bar and label
        Row(
          children: [
            Expanded(
              child: Container(
                height: 4,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  color: Colors.grey.shade300,
                ),
                child: FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: (strength.score + 1) / 5,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: strength.color,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: strength.color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: strength.color.withOpacity(0.3)),
              ),
              child: Text(
                strength.label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: strength.color,
                ),
              ),
            ),
          ],
        ),

        if (isCompact && strength.quickTips.isNotEmpty) ...[
          const SizedBox(height: 6),
          // Compact tips with icons
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: strength.quickTips
                .map((tip) => _buildCompactTip(tip))
                .toList(),
          ),
        ],

        if (!isCompact) ...[
          const SizedBox(height: 8),
          // Detailed feedback (for non-compact mode)
          ...strength.feedback.map(
            (feedback) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 14,
                    color: Colors.orange.shade600,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      feedback,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.orange.shade600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          ...strength.suggestions.map(
            (suggestion) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    size: 14,
                    color: Colors.blue.shade600,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      suggestion,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.blue.shade600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCompactTip(QuickTip tip) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: tip.isCompleted ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: tip.isCompleted ? Colors.green.shade300 : Colors.red.shade300,
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            tip.isCompleted ? Icons.check_circle : Icons.cancel,
            size: 12,
            color: tip.isCompleted
                ? Colors.green.shade600
                : Colors.red.shade600,
          ),
          const SizedBox(width: 3),
          Text(
            tip.label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w500,
              color: tip.isCompleted
                  ? Colors.green.shade700
                  : Colors.red.shade700,
            ),
          ),
        ],
      ),
    );
  }

  PasswordStrength _getPasswordStrength(String password) {
    if (password.isEmpty) {
      return PasswordStrength(
        score: 0,
        label: 'Very Weak',
        color: Colors.red.shade500,
        feedback: [],
        suggestions: [],
        quickTips: [],
      );
    }

    int score = 0;
    final feedback = <String>[];
    final suggestions = <String>[];
    final quickTips = <QuickTip>[];

    // Basic character type checks
    final checks = {
      'length': password.length >= 8,
      'lowercase': RegExp(r'[a-z]').hasMatch(password),
      'uppercase': RegExp(r'[A-Z]').hasMatch(password),
      'number': RegExp(r'[0-9]').hasMatch(password),
      'special': RegExp(r'[^A-Za-z0-9]').hasMatch(password),
    };

    // Calculate base score and create quick tips
    if (checks['length']!) {
      score++;
      quickTips.add(QuickTip('8+', true));
    } else {
      quickTips.add(QuickTip('8+', false));
      suggestions.add('Make it at least 8 characters long');
    }

    if (checks['lowercase']!) {
      score++;
      quickTips.add(QuickTip('a-z', true));
    } else {
      quickTips.add(QuickTip('a-z', false));
      suggestions.add('Add lowercase letters');
    }

    if (checks['uppercase']!) {
      score++;
      quickTips.add(QuickTip('A-Z', true));
    } else {
      quickTips.add(QuickTip('A-Z', false));
      suggestions.add('Add uppercase letters');
    }

    if (checks['number']!) {
      score++;
      quickTips.add(QuickTip('0-9', true));
    } else {
      quickTips.add(QuickTip('0-9', false));
      suggestions.add('Add numbers');
    }

    if (checks['special']!) {
      score++;
      quickTips.add(QuickTip('@#\$', true));
    } else {
      quickTips.add(QuickTip('@#\$', false));
      suggestions.add('Add special characters');
    }

    // Pattern detection and penalties
    final patterns = {
      'sequential': RegExp(
        r'(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',
        caseSensitive: false,
      ).hasMatch(password),
      'repeated': RegExp(r'(.)\1{2,}').hasMatch(password),
      'allNumbers': RegExp(r'^\d+$').hasMatch(password),
      'allLetters': RegExp(r'^[a-zA-Z]+$').hasMatch(password),
      'commonPatterns': RegExp(
        r'^(123|321|000|111|222|333|444|555|666|777|888|999|abc|qwe|asd|zxc)$',
        caseSensitive: false,
      ).hasMatch(password),
      'years': RegExp(r'^(19|20)\d{2}$').hasMatch(password),
      'phonePattern': RegExp(r'^\d{7,11}$').hasMatch(password),
    };

    // Apply penalties for weak patterns
    if (patterns['sequential']!) {
      score = max(0, score - 2);
      feedback.add('Avoid sequential patterns');
    }

    if (patterns['repeated']!) {
      score = max(0, score - 2);
      feedback.add('Avoid repeated characters');
    }

    if (patterns['allNumbers']!) {
      score = max(0, score - 1);
      feedback.add('Mix letters with numbers');
    }

    if (patterns['allLetters']!) {
      score = max(0, score - 1);
      feedback.add('Mix numbers with letters');
    }

    if (patterns['commonPatterns']!) {
      score = max(0, score - 3);
      feedback.add('Avoid common patterns');
    }

    if (patterns['years']!) {
      score = max(0, score - 1);
      feedback.add('Avoid using years');
    }

    if (patterns['phonePattern']!) {
      score = max(0, score - 1);
      feedback.add('Avoid phone numbers');
    }

    // Calculate entropy for additional insight
    final uniqueChars = password.split('').toSet().length;
    final entropy = log(pow(uniqueChars, password.length)) / log(2);

    if (entropy < 20) {
      feedback.add('Too predictable - use more random characters');
    }

    // Determine final strength
    String label = 'Very Weak';
    Color color = Colors.red.shade500;

    if (score >= 4 && entropy >= 30) {
      label = 'Strong';
      color = Colors.green.shade500;
    } else if (score >= 3 && entropy >= 20) {
      label = 'Good';
      color = Colors.blue.shade500;
    } else if (score >= 2) {
      label = 'Fair';
      color = Colors.yellow.shade600;
    } else if (score >= 1) {
      label = 'Weak';
      color = Colors.orange.shade500;
    }

    return PasswordStrength(
      score: min(4, max(0, score)),
      label: label,
      color: color,
      feedback: feedback,
      suggestions: suggestions,
      quickTips: quickTips,
      entropy: entropy.round(),
    );
  }
}

class PasswordStrength {
  final int score;
  final String label;
  final Color color;
  final List<String> feedback;
  final List<String> suggestions;
  final List<QuickTip> quickTips;
  final int? entropy;

  PasswordStrength({
    required this.score,
    required this.label,
    required this.color,
    required this.feedback,
    required this.suggestions,
    required this.quickTips,
    this.entropy,
  });
}

class QuickTip {
  final String label;
  final bool isCompleted;

  QuickTip(this.label, this.isCompleted);
}
