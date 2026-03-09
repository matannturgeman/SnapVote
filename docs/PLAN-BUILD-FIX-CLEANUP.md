# Nx Project Build Fix & Cleanup Plan

## 📅 Date Created
`2026-03-05`

## 🎯 Objectives
1. Fix build failures in the `api` project
2. Clean up untracked `.d.ts` files from `libs/backend-data-access`
3. Ensure `backend-data-access` library builds to `dist/libs/` folder like other projects
4. Review and understand all uncommitted changes

---

## 📊 Current State Analysis

### Git Status Summary
```bash
# Modified files (uncommitted changes)
- apps/api/project.json
- apps/api/tsconfig.app.json
- apps/api/tsconfig.json
- apps/api/webpack.config.js
- libs/backend-data-access/project.json
- libs/backend-data-access/src/index.ts
- libs/backend-data-access/*.json (tsconfig files)
- libs/shared-types/**/*.json
- libs/shared-utils/**/*.json
- libs/ui/**/*.json
- libs/validation-schemas/**/*.json
- tsconfig.base.json

# Untracked .d.ts files (should be removed)
libs/backend-data-access/src/index.d.ts
libs/backend-data-access/src/index.d.ts.map
libs/backend-data-access/src/lib/*.d.ts
libs/backend-data-access/src/lib/*.d.ts.map
```

---

## 🔍 Issues Identified

### 1. API Project Build Configuration Issues

#### Problem: Removed dependency reference to backend-data-access
**Location:** `apps/api/tsconfig.app.json`
- The `references` section removed the reference to `libs/backend-data-access/tsconfig.lib.json`
- This breaks TypeScript path resolution for the API app

#### Current Config:
```json
{
  "references": [] // <-- MISSING REFERENCE TO backend-data-access
}
```

#### Required Fix:
```json
{
  "references": [
    {
      "path": "../../libs/backend-data-access/tsconfig.lib.json"
    }
  ]
}
```

---

### 2. Backend-Data-Access Library Build Output

#### Status: ✅ Already Correctly Configured
**Location:** `libs/backend-data-access/project.json`

The lib is already configured to build to the correct output path:
```json
{
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/backend-data-access", // ✅ CORRECT
        "main": "libs/backend-data-access/src/index.ts",
        "tsConfig": "libs/backend-data-access/tsconfig.lib.json",
        "assets": ["libs/backend-data-access/*.md"]
      }
    }
  }
}
```

**Action Required:** Verify the build works after restoring API dependencies.

---

### 3. Untracked .d.ts Files

These files were generated during build but should not be committed:

#### Location: `libs/backend-data-access/src/`
- `index.d.ts`
- `index.d.ts.map`
- `lib/backend-data-access.module.d.ts`
- `lib/backend-data-access.module.d.ts.map`
- `lib/http-exception.filter.d.ts`
- `lib/http-exception.filter.d.ts.map`
- `lib/index.d.ts`
- `lib/index.d.ts.map`
- `lib/prisma.module.d.ts`
- `lib/prisma.module.d.ts.map`

**Action Required:** Delete all `.d.ts` and `.d.ts.map` files in `libs/backend-data-access/src/`

---

### 4. Code Changes Review

#### Backend-Data-Access Export Changes
**Location:** `libs/backend-data-access/src/index.ts`

**Change Made:** Removed prisma generated export
```diff
- export * from './lib';
- export * from './generated/prisma'; // <-- REMOVED
+ export * from './lib';
```

#### API Webpack Config Changes
**Location:** `apps/api/webpack.config.js`

**Change Made:** Added `useTsconfigPaths: true` option
```diff
+ sourceMap: true,
+ useTsconfigPaths: true, // ✅ ADDED
```

This requires `tsconfig.base.json` to have proper path mappings (already configured).

---

## 🚀 Execution Plan

### Phase 1: Restore Missing Dependencies

**Task 1.1:** Fix `apps/api/tsconfig.app.json`

Execute the following commands to restore the missing reference:
```bash
# Read current tsconfig.app.json and add backend-data-access reference back
# Or recreate with proper configuration
```

Expected final `apps/api/tsconfig.app.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "composite": false,
    "declaration": false,
    "declarationMap": false,
    "emitDeclarationOnly": false
  },
  "include": ["src/**/*.ts"],
  "exclude": [
    "jest.config.ts",
    "jest.config.cts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts"
  ],
  "references": [
    {
      "path": "../../libs/backend-data-access/tsconfig.lib.json"
    }
  ]
}
```

---

### Phase 2: Clean Up Untracked Files

**Task 2.1:** Remove all `.d.ts` files from backend-data-access lib

```bash
# Find and list all .d.ts files
find libs/backend-data-access -name "*.d.ts" -type f

# Delete all generated type definition files
rm -rf libs/backend-data-access/src/**/*.d.ts
rm -rf libs/backend-data-access/src/**/*.d.ts.map
```

---

### Phase 3: Verify Build Configuration

**Task 3.1:** Run build for backend-data-access lib
```bash
nx run backend-data-access:build
```

Expected output:
- Output should be in `dist/libs/backend-data-access/`
- Should contain `package.json`, `index.js`, type definitions
- Should NOT contain `.d.ts` files (those are generated, not committed)

**Task 3.2:** Run build for API app
```bash
nx run api:build
```

Expected output:
- Output should be in `dist/api/`
- Should include all dependencies from dist folders

---

### Phase 4: Final Verification

**Task 4.1:** Check git status to ensure clean state
```bash
git status
```

**Task 4.2:** Commit the changes
```bash
git add .
git commit -m "fix(api): restore backend-data-access dependency reference
fix(cleanup): remove untracked .d.ts files from backend-data-access lib
chore(config): ensure libs build to dist/libs/ folder correctly"
```

---

## 🔧 Detailed Step-by-Step Commands

### Command Sequence for Full Fix:

```bash
# Step 1: Restore tsconfig.app.json references
# Edit apps/api/tsconfig.app.json and add backend-data-access reference

# Step 2: Remove .d.ts files
cd nx-project
find libs/backend-data-access/src -name "*.d.ts" -o -name "*.d.ts.map" | xargs rm -f

# Step 3: Verify git status
git status

# Step 4: Commit changes
git add .
git commit -m "fix(api): restore backend-data-access dependency reference
fix(cleanup): remove untracked .d.ts files
chore(build): ensure libs build to dist/libs/"
```

---

## 📋 Pre-Restore State Checklist

### Files Already Modified (Review Complete ✅)
- [x] `apps/api/project.json` - webpack configuration updated
- [x] `apps/api/tsconfig.app.json` - missing lib reference ⚠️
- [x] `apps/api/webpack.config.js` - useTsconfigPaths added ✅
- [x] `libs/backend-data-access/project.json` - build target configured ✅
- [x] `libs/backend-data-access/src/index.ts` - prisma export removed ✅
- [x] All other lib project.json files reviewed ✅

### Files to Fix (Action Required)
- [ ] Restore backend-data-access reference in `apps/api/tsconfig.app.json`
- [ ] Delete all `.d.ts` files from `libs/backend-data-access/src/`
- [ ] Run build verification

---

## ⚠️ Important Notes

1. **Backend-data-access Output Path**: Already correctly set to `dist/libs/backend-data-access`. No changes needed here.

2. **.d.ts Files**: These are generated during TypeScript compilation and should never be committed to version control. They belong in `.gitignore` or should be cleaned up after each build.

3. **Path References**: The API app needs references to all its dependencies (libs) for proper module resolution. The current config removed this reference.

4. **Webpack useTsconfigPaths**: The `useTsconfigPaths: true` option in webpack.config.js allows webpack to resolve TypeScript paths from tsconfig.base.json. This is correct and should be kept.

---

## 📞 Next Steps

Please review this plan and let me know which phase you'd like to execute first:

1. **Phase 1**: Restore the backend-data-access reference in `apps/api/tsconfig.app.json`
2. **Phase 2**: Remove all untracked `.d.ts` files
3. **Phase 3**: Verify builds work correctly
4. **Phase 4**: Commit changes and verify git status

Alternatively, I can execute these phases sequentially if you prefer automation over manual review.

---

## 📝 Contact

For any questions or clarifications about this plan, feel free to ask before proceeding with the execution steps.