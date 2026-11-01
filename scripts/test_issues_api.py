"""
GitLab Project Issues API - Automated Test Execution Script
Lab 1 - SQE3 - Group 4 (Yeraldin)

This script demonstrates basic API automation for the core lifecycle
of GitLab project issues: Create, Retrieve, Update (close), Filter, and Delete.
"""

import os
import sys
import uuid
import requests

BASE_URL = os.getenv("GITLAB_BASE_URL", "https://gitlab.com/api/v4")
PROJECT_ID = os.getenv("GITLAB_PROJECT_ID", "12345678")
ACCESS_TOKEN = os.getenv("GITLAB_ACCESS_TOKEN", "mock-or-real-token")

HEADERS = {
    "PRIVATE-TOKEN": ACCESS_TOKEN,
    "Content-Type": "application/json"
}

def create_issue(title: str, description: str, labels: str = "bug,sqe3"):
    """TC_ISSUE_POST_001: Create an issue with valid data."""
    url = f"{BASE_URL}/projects/{PROJECT_ID}/issues"
    payload = {
        "title": title,
        "description": description,
        "labels": labels
    }
    print(f"\n[1] POST {url}")
    print(f"Payload: {payload}")
    response = requests.post(url, headers=HEADERS, json=payload)
    print(f"Status: {response.status_code}")
    return response

def get_issue(issue_iid: int):
    """TC_ISSUE_GET_001: Retrieve an existing issue by its iid."""
    url = f"{BASE_URL}/projects/{PROJECT_ID}/issues/{issue_iid}"
    print(f"\n[2] GET {url}")
    response = requests.get(url, headers=HEADERS)
    print(f"Status: {response.status_code}")
    return response

def close_issue(issue_iid: int, updated_description: str):
    """TC_ISSUE_PUT_002: Close an issue using state_event."""
    url = f"{BASE_URL}/projects/{PROJECT_ID}/issues/{issue_iid}"
    payload = {
        "description": updated_description,
        "state_event": "close"
    }
    print(f"\n[3] PUT {url}")
    print(f"Payload: {payload}")
    response = requests.put(url, headers=HEADERS, json=payload)
    print(f"Status: {response.status_code}")
    return response

def list_closed_issues():
    """TC_ISSUE_GET_003: Filter issues by closed state."""
    url = f"{BASE_URL}/projects/{PROJECT_ID}/issues?state=closed"
    print(f"\n[4] GET {url}")
    response = requests.get(url, headers=HEADERS)
    print(f"Status: {response.status_code}")
    return response

def delete_issue(issue_iid: int):
    """TC_ISSUE_DELETE_001: Delete an existing issue."""
    url = f"{BASE_URL}/projects/{PROJECT_ID}/issues/{issue_iid}"
    print(f"\n[5] DELETE {url}")
    response = requests.delete(url, headers=HEADERS)
    print(f"Status: {response.status_code}")
    return response

def run_dry_run_demo():
    """Prints documentation flow when credentials are not configured."""
    run_id = uuid.uuid4().hex[:8]
    title = f"sqe3-issue-{run_id}"
    print("=" * 60)
    print("GitLab Issues REST API - Test Automation Demo")
    print(f"Base URL:    {BASE_URL}")
    print(f"Project ID:  {PROJECT_ID}")
    print(f"Test Run ID: {run_id}")
    print(f"Test Title:  {title}")
    print("=" * 60)
    print("\nTo execute against live GitLab instance, provide environment variables:")
    print("  export GITLAB_BASE_URL='https://gitlab.com/api/v4'")
    print("  export GITLAB_PROJECT_ID='<YOUR_NUMERIC_PROJECT_ID>'")
    print("  export GITLAB_ACCESS_TOKEN='<YOUR_PERSONAL_ACCESS_TOKEN>'")
    print("\nDry run completed successfully.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--live":
        run_id = uuid.uuid4().hex[:8]
        test_title = f"sqe3-issue-{run_id}"
        
        # 1. Create
        res_post = create_issue(test_title, "Initial defect description")
        if res_post.status_code != 201:
            print(f"Failed to create issue: {res_post.text}")
            sys.exit(1)
        iid = res_post.json().get("iid")
        print(f"Created Issue IID: {iid}")

        # 2. Get
        res_get = get_issue(iid)
        assert res_get.status_code == 200

        # 3. Update & Close
        res_put = close_issue(iid, "Defect resolved by patch")
        assert res_put.status_code == 200
        assert res_put.json().get("state") == "closed"

        # 4. List closed
        res_list = list_closed_issues()
        assert res_list.status_code == 200

        # 5. Delete (Cleanup)
        res_del = delete_issue(iid)
        assert res_del.status_code == 204
        print(f"\nSuccessfully executed and cleaned up defect issue {iid}.")
    else:
        run_dry_run_demo()
