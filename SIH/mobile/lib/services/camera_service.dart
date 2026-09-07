import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as path;
import '../config/app_config.dart';

/// Camera and photo service for field reports
class CameraService {
  static final CameraService _instance = CameraService._internal();
  factory CameraService() => _instance;
  CameraService._internal();

  final ImagePicker _picker = ImagePicker();

  /// Take a photo using the device camera
  Future<PhotoResult> takePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: AppConfig.imageQuality,
        maxWidth: AppConfig.maxImageWidth,
        maxHeight: AppConfig.maxImageHeight,
      );

      if (photo == null) {
        return PhotoResult.cancelled();
      }

      // Create a permanent local path for the photo
      final String localPath = await _savePhotoLocally(photo);
      
      return PhotoResult.success(localPath);

    } catch (e) {
      return PhotoResult.error('Camera error: ${e.toString()}');
    }
  }

  /// Select a photo from the device gallery
  Future<PhotoResult> selectFromGallery() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: AppConfig.imageQuality,
        maxWidth: AppConfig.maxImageWidth,
        maxHeight: AppConfig.maxImageHeight,
      );

      if (photo == null) {
        return PhotoResult.cancelled();
      }

      // Create a permanent local path for the photo
      final String localPath = await _savePhotoLocally(photo);
      
      return PhotoResult.success(localPath);

    } catch (e) {
      return PhotoResult.error('Gallery error: ${e.toString()}');
    }
  }

  /// Save photo to local app directory with unique filename
  Future<String> _savePhotoLocally(XFile photo) async {
    // Generate unique filename with timestamp
    final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final String extension = path.extension(photo.path);
    final String filename = 'field_report_$timestamp$extension';
    
    // Get app documents directory
    final Directory appDir = Directory('/data/data/com.sih.nersanchaar.ner_sanchaar_field/app_flutter');
    if (!await appDir.exists()) {
      await appDir.create(recursive: true);
    }
    
    final String localPath = path.join(appDir.path, filename);
    
    // Copy file to permanent location
    final File sourceFile = File(photo.path);
    await sourceFile.copy(localPath);
    
    return localPath;
  }

  /// Check if photo file exists
  Future<bool> photoExists(String? photoPath) async {
    if (photoPath == null) return false;
    return await File(photoPath).exists();
  }

  /// Get photo file size
  Future<int?> getPhotoSize(String? photoPath) async {
    if (photoPath == null) return null;
    try {
      final File file = File(photoPath);
      if (await file.exists()) {
        return await file.length();
      }
    } catch (e) {
      // File access error
    }
    return null;
  }

  /// Delete a photo file
  Future<bool> deletePhoto(String? photoPath) async {
    if (photoPath == null) return false;
    try {
      final File file = File(photoPath);
      if (await file.exists()) {
        await file.delete();
        return true;
      }
    } catch (e) {
      // File delete error
    }
    return false;
  }
}

/// Photo operation result
class PhotoResult {
  final bool success;
  final String? photoPath;
  final String? error;
  final bool cancelled;

  PhotoResult._({
    required this.success,
    this.photoPath,
    this.error,
    this.cancelled = false,
  });

  factory PhotoResult.success(String photoPath) {
    return PhotoResult._(
      success: true,
      photoPath: photoPath,
    );
  }

  factory PhotoResult.error(String error) {
    return PhotoResult._(
      success: false,
      error: error,
    );
  }

  factory PhotoResult.cancelled() {
    return PhotoResult._(
      success: false,
      cancelled: true,
    );
  }
}