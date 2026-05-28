#!/bin/bash

HOOKS_ROOT_DIR="$(dirname "${BASH_SOURCE[0]}")/.."
SCRIPT="$HOOKS_ROOT_DIR/prepare-commit-msg.sh"

function set_up_before_script() {
  export TEST=true
}

function tear_down_after_script() {
  unset TEST
  unset SCRIPT
}

function test_StudyMesh_lazy_approach() {
  export TEST_BRANCH="feature/feature-1"
  assert_equals "StudyMesh:FEATURE-1 My commit message" "$($SCRIPT "My commit message")"
}

function test_ignore_all_when_using_StudyMesh_full_approach() {
  export TEST_BRANCH="feature/feature-2"
  assert_equals "" "$($SCRIPT "StudyMesh:FEATURE-2 My commit message")"
}

function test_StudyMesh_lazy_approach_dev_branch() {
  export TEST_BRANCH="dev"
  assert_equals "StudyMesh:DEV My commit message" "$($SCRIPT "My commit message")"
}

function test_StudyMesh_lazy_approach_main_branch() {
  export TEST_BRANCH="main"
  assert_equals "StudyMesh:MAIN My commit message" "$($SCRIPT "My commit message")"
}
