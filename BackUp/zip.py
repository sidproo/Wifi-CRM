#!/usr/bin/env python3
"""
Directory Zip Maker
Creates a zip file of all contents in the current directory except the zip file itself.
Designed for use in Termux and other terminal environments.
"""

import os
import zipfile
import sys
from datetime import datetime
import argparse

def get_zip_filename():
    """Generate a timestamped zip filename"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"directory_backup_{timestamp}.zip"

def should_exclude_file(filepath, zip_filename):
    """Check if a file should be excluded from the zip"""
    filename = os.path.basename(filepath)
    
    # Exclude the zip file itself
    if filename == zip_filename:
        return True
    
    # Exclude hidden files starting with .
    if filename.startswith('.'):
        return True
    
    # Exclude common temporary files
    temp_extensions = {'.tmp', '.temp', '.swp', '.bak', '~'}
    if any(filename.endswith(ext) for ext in temp_extensions):
        return True
    
    return False

def create_directory_zip(output_filename=None, exclude_hidden=True):
    """Create a zip file of the current directory"""
    
    # Get current directory
    current_dir = os.getcwd()
    
    # Generate zip filename if not provided
    if output_filename is None:
        output_filename = get_zip_filename()
    
    # Ensure .zip extension
    if not output_filename.endswith('.zip'):
        output_filename += '.zip'
    
    print(f"Creating zip file: {output_filename}")
    print(f"Source directory: {current_dir}")
    
    files_added = 0
    folders_added = 0
    
    try:
        with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            
            # Walk through all files and directories
            for root, dirs, files in os.walk('.'):
                
                # Process directories
                for dir_name in dirs:
                    dir_path = os.path.join(root, dir_name)
                    
                    # Skip hidden directories if exclude_hidden is True
                    if exclude_hidden and dir_name.startswith('.'):
                        continue
                    
                    # Add empty directories to zip
                    zipf.write(dir_path)
                    folders_added += 1
                
                # Process files
                for file_name in files:
                    file_path = os.path.join(root, file_name)
                    
                    # Check if file should be excluded
                    if should_exclude_file(file_path, output_filename):
                        continue
                    
                    # Skip hidden files if exclude_hidden is True
                    if exclude_hidden and file_name.startswith('.'):
                        continue
                    
                    try:
                        # Add file to zip
                        zipf.write(file_path)
                        files_added += 1
                        print(f"Added: {file_path}")
                        
                    except Exception as e:
                        print(f"Warning: Could not add {file_path}: {e}")
    
    except Exception as e:
        print(f"Error creating zip file: {e}")
        return False
    
    # Get final zip file size
    zip_size = os.path.getsize(output_filename)
    zip_size_mb = zip_size / (1024 * 1024)
    
    print(f"\n✓ Zip file created successfully!")
    print(f"📁 Files added: {files_added}")
    print(f"📂 Folders added: {folders_added}")
    print(f"📦 Zip file size: {zip_size_mb:.2f} MB")
    print(f"📍 Location: {os.path.abspath(output_filename)}")
    
    return True

def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(
        description="Create a zip file of all contents in the current directory"
    )
    parser.add_argument(
        '-o', '--output',
        help='Output zip filename (default: timestamped filename)',
        default=None
    )
    parser.add_argument(
        '--include-hidden',
        action='store_true',
        help='Include hidden files and directories (those starting with .)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Verbose output (show each file being added)'
    )
    
    args = parser.parse_args()
    
    # Show what directory we're working with
    current_dir = os.getcwd()
    print(f"Working directory: {current_dir}")
    
    # Count items in directory for preview
    total_items = sum(len(files) + len(dirs) for _, dirs, files in os.walk('.'))
    print(f"Found {total_items} items to potentially zip")
    
    # Confirm with user
    if not args.verbose:
        response = input("\nProceed with creating zip? (y/N): ").lower().strip()
        if response != 'y' and response != 'yes':
            print("Operation cancelled.")
            sys.exit(0)
    
    # Create the zip
    success = create_directory_zip(
        output_filename=args.output,
        exclude_hidden=not args.include_hidden
    )
    
    if success:
        print("\n🎉 Zip creation completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Zip creation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()