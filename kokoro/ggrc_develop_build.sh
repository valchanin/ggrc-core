# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

set -o nounset
set -o errexit

set -x

CURRENT_SCRIPTPATH=$( cd "$(dirname "$0")" ; pwd -P )
$CURRENT_SCRIPTPATH/install_deps.sh

EXIT=0
$CURRENT_SCRIPTPATH/../bin/jenkins/run_checkstyle -p  || EXIT=$?
cd "${CURRENT_SCRIPTPATH}/../"
git clean -xdfq --exclude="test/*.xml" --exclude="test/*.out"
$CURRENT_SCRIPTPATH/../bin/jenkins/run_code_style -p  || EXIT=$?
cd "${CURRENT_SCRIPTPATH}/../"
git clean -xdfq --exclude="test/*.xml" --exclude="test/*.out"
$CURRENT_SCRIPTPATH/../bin/jenkins/run_unittests -p   || EXIT=$?
cd "${CURRENT_SCRIPTPATH}/../"
git clean -xdfq --exclude="test/*.xml" --exclude="test/*.out"
$CURRENT_SCRIPTPATH/../bin/jenkins/run_integration -p || EXIT=$?
cd "${CURRENT_SCRIPTPATH}/../"
git clean -xdfq --exclude="test/*.xml" --exclude="test/*.out"
$CURRENT_SCRIPTPATH/../bin/jenkins/run_selenium -p    || EXIT=$?
cd "${CURRENT_SCRIPTPATH}/../"
git clean -xdfq --exclude="test/*.xml" --exclude="test/*.out"
exit $EXIT
