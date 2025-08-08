# -----------------------------------------------------------------------------
# Sync your GitHub fork with the upstream repository
#
# 1. Copy this function into your ~/.zshrc or ~/.bash_profile
# 2. Run: source ~/.zshrc          # or source ~/.bash_profile (if using bash)
# 3. Usage:
#    syncfork                      # syncs 'main' branch
#    syncfork dev                  # syncs 'dev' branch (or any other branch)
#
# ! Make sure to add the upstream remote first (only once per repo):
#    git remote add upstream https://github.com/original/repo.git
# Verify with:
#    git remote -v
# -----------------------------------------------------------------------------

syncfork() {
  local branch="${1:-main}"

  echo "Fetching upstream..."
  git fetch upstream

  echo "Checking out $branch branch..."
  git checkout "$branch" || { echo "Branch $branch not found"; return 1; }

  echo "Rebasing $branch with upstream/$branch..."
  git rebase "upstream/$branch" || { echo "Rebase failed"; return 1; }

  echo "Pushing changes to origin/$branch..."
  git push origin "$branch"
}
