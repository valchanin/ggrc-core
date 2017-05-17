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
echo "Test successful."
