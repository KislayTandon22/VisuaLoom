"""
tests/test_drive_manager.py
---------------------------
Pytest suite for drive_manager.py
"""

import sys, os
import pytest
import numpy as np

# Add parent directory of python_code/tests to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import os
import pytest
from drive_manager import list_drives, list_directory, get_drive_tree


# -----------------------------------
# Fixtures (reusable test setup)
# -----------------------------------

@pytest.fixture
def home_dir():
    """Return the user's home directory path."""
    return os.path.expanduser("~")


# -----------------------------------
# Tests for list_drives
# -----------------------------------

def test_list_drives_returns_list():
    drives = list_drives()
    assert isinstance(drives, list), "Expected list of drives"
    # Each drive should have expected keys
    if drives:
        keys = ["device", "mountpoint", "fstype", "total_gb", "used_gb", "free_gb"]
        for key in keys:
            assert key in drives[0], f"Missing key: {key}"


# -----------------------------------
# Tests for list_directory
# -----------------------------------

def test_list_directory_valid(home_dir):
    result = list_directory(home_dir, include_files=False)
    assert isinstance(result, dict)
    assert "folders" in result
    assert isinstance(result["folders"], list)
    # Folders can be empty, but structure must exist
    for folder in result["folders"]:
        assert "name" in folder and "path" in folder and "type" in folder


def test_list_directory_invalid_path():
    result = list_directory("/path/that/does/not/exist", include_files=True)
    assert "error" in result
    assert "not found" in result["error"].lower()


# -----------------------------------
# Tests for get_drive_tree
# -----------------------------------

def test_get_drive_tree_structure():
    result = get_drive_tree()
    assert isinstance(result, dict), "Expected dict of drive trees"
    # Keys are mountpoints, values are folder lists
    for mount, folders in result.items():
        assert isinstance(mount, str)
        assert isinstance(folders, list)
        for f in folders:
            assert "name" in f and "path" in f
