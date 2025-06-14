#!/usr/bin/env node

/**
 * Production Optimization and Testing Script
 * 
 * This script performs comprehensive testing and optimization for the Expo Atlas app
 * to ensure production readiness.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionOptimizer {
  constructor() {
    this.results = {
      tests: [],
      optimizations: [],
      errors: [],
      warnings: [],
      metrics: {}
    };
    this.projectRoot = path.resolve(__dirname, '..');
  }

  /**
   * Run all optimization and testing procedures
   */
  async optimize() {
    console.log('🚀 Starting Production Optimization...\n');
    
    try {
      // 1. Environment Check
      await this.checkEnvironment();
      
      // 2. Dependency Analysis
      await this.analyzeDependencies();
      
      // 3. Code Quality Checks
      await this.runCodeQualityChecks();
      
      // 4. Security Audit
      await this.runSecurityAudit();
      
      // 5. Performance Optimization
      await this.optimizePerformance();
      
      // 6. Bundle Analysis
      await this.analyzeBundles();
      
      // 7. Testing
      await this.runTests();
      
      // 8. Build Verification
      await this.verifyBuilds();
      
      // 9. Generate Report
      await this.generateReport();
      
      console.log('\n✅ Production optimization completed!\n');
      
    } catch (error) {
      this.results.errors.push({
        type: 'CRITICAL',
        message: error.message,
        stack: error.stack
      });
      console.error('❌ Optimization failed:', error.message);
    }
  }

  /**
   * Check environment setup
   */
  async checkEnvironment() {
    console.log('🔍 Checking Environment...');
    
    const checks = [
      {
        name: 'Node.js Version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.slice(1).split('.')[0]);
          return { passed: major >= 18, details: version };
        }
      },
      {
        name: 'Package Manager',
        check: () => {
          try {
            execSync('npm --version', { stdio: 'pipe' });
            return { passed: true, details: 'npm available' };
          } catch {
            return { passed: false, details: 'npm not available' };
          }
        }
      },
      {
        name: 'Expo CLI',
        check: () => {
          try {
            execSync('npx expo --version', { stdio: 'pipe' });
            return { passed: true, details: 'Expo CLI available' };
          } catch {
            return { passed: false, details: 'Expo CLI not available' };
          }
        }
      },
      {
        name: 'Environment Variables',
        check: () => {
          const requiredVars = [
            'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
            'EXPO_PUBLIC_SUPABASE_URL',
            'EXPO_PUBLIC_SUPABASE_ANON_KEY',
            'EXPO_PUBLIC_OPENAI_API_KEY'
          ];
          
          const missing = requiredVars.filter(varName => !process.env[varName]);
          return {
            passed: missing.length === 0,
            details: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All required vars present'
          };
        }
      }
    ];

    for (const check of checks) {
      const result = check.check();
      this.results.tests.push({
        category: 'Environment',
        name: check.name,
        passed: result.passed,
        details: result.details
      });
      
      if (!result.passed) {
        this.results.errors.push({
          type: 'ENVIRONMENT',
          message: `${check.name}: ${result.details}`
        });
      }
    }
  }

  /**
   * Analyze dependencies for security and optimization
   */
  async analyzeDependencies() {
    console.log('📦 Analyzing Dependencies...');
    
    try {
      // Check for outdated packages
      const outdated = execSync('npm outdated --json', { 
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      if (outdated) {
        const outdatedPackages = JSON.parse(outdated);
        const count = Object.keys(outdatedPackages).length;
        
        this.results.warnings.push({
          type: 'DEPENDENCIES',
          message: `${count} outdated packages found`,
          details: outdatedPackages
        });
      }
    } catch (error) {
      // npm outdated returns non-zero exit code when packages are outdated
      // This is expected behavior
    }

    // Check bundle size
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')
      );
      
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
      
      this.results.metrics.dependencies = {
        production: depCount,
        development: devDepCount,
        total: depCount + devDepCount
      };
      
      if (depCount > 50) {
        this.results.warnings.push({
          type: 'BUNDLE_SIZE',
          message: `High number of production dependencies (${depCount})`
        });
      }
    } catch (error) {
      this.results.errors.push({
        type: 'DEPENDENCY_ANALYSIS',
        message: `Failed to analyze package.json: ${error.message}`
      });
    }
  }

  /**
   * Run code quality checks
   */
  async runCodeQualityChecks() {
    console.log('🔍 Running Code Quality Checks...');
    
    // TypeScript type checking
    try {
      execSync('npx tsc --noEmit', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      this.results.tests.push({
        category: 'Code Quality',
        name: 'TypeScript Compilation',
        passed: true,
        details: 'No type errors found'
      });
    } catch (error) {
      this.results.tests.push({
        category: 'Code Quality',
        name: 'TypeScript Compilation',
        passed: false,
        details: 'Type errors found'
      });
      
      this.results.errors.push({
        type: 'TYPE_CHECK',
        message: 'TypeScript compilation failed',
        details: error.stdout?.toString() || error.message
      });
    }

    // Check for common anti-patterns
    this.checkCodePatterns();
  }

  /**
   * Check for common code anti-patterns
   */
  checkCodePatterns() {
    const sourceDir = path.join(this.projectRoot, 'src');
    const antiPatterns = [
      {
        name: 'Console.log statements',
        pattern: /console\.log\(/g,
        severity: 'warning'
      },
      {
        name: 'TODO comments',
        pattern: /\/\/\s*TODO/gi,
        severity: 'info'
      },
      {
        name: 'Hardcoded API keys',
        pattern: /['"](sk-|pk_|rk_)[A-Za-z0-9]{20,}['"]/g,
        severity: 'critical'
      },
      {
        name: 'Empty catch blocks',
        pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
        severity: 'warning'
      }
    ];

    const checkDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          for (const pattern of antiPatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
              const result = {
                type: 'CODE_PATTERN',
                message: `${pattern.name} found in ${path.relative(this.projectRoot, filePath)}`,
                severity: pattern.severity,
                count: matches.length
              };
              
              if (pattern.severity === 'critical') {
                this.results.errors.push(result);
              } else {
                this.results.warnings.push(result);
              }
            }
          }
        }
      }
    };

    if (fs.existsSync(sourceDir)) {
      checkDirectory(sourceDir);
    }
  }

  /**
   * Run security audit
   */
  async runSecurityAudit() {
    console.log('🔒 Running Security Audit...');
    
    try {
      // NPM audit
      const auditResult = execSync('npm audit --json', { 
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const audit = JSON.parse(auditResult);
      
      if (audit.metadata.vulnerabilities.total > 0) {
        this.results.warnings.push({
          type: 'SECURITY',
          message: `${audit.metadata.vulnerabilities.total} vulnerabilities found`,
          details: audit.metadata.vulnerabilities
        });
      }
      
      this.results.metrics.security = audit.metadata.vulnerabilities;
      
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      try {
        const auditResult = error.stdout?.toString();
        if (auditResult) {
          const audit = JSON.parse(auditResult);
          this.results.metrics.security = audit.metadata.vulnerabilities;
          
          if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
            this.results.errors.push({
              type: 'SECURITY',
              message: 'High/Critical vulnerabilities found',
              details: audit.metadata.vulnerabilities
            });
          }
        }
      } catch (parseError) {
        this.results.errors.push({
          type: 'SECURITY_AUDIT',
          message: 'Failed to parse security audit results'
        });
      }
    }
  }

  /**
   * Optimize performance
   */
  async optimizePerformance() {
    console.log('⚡ Optimizing Performance...');
    
    // Check image assets
    this.optimizeAssets();
    
    // Check for performance anti-patterns
    this.checkPerformancePatterns();
    
    // Verify lazy loading
    this.checkLazyLoading();
  }

  /**
   * Optimize assets
   */
  optimizeAssets() {
    const assetsDir = path.join(this.projectRoot, 'assets');
    if (!fs.existsSync(assetsDir)) return;

    const checkAssets = (dir) => {
      const files = fs.readdirSync(dir);
      let totalSize = 0;
      let imageCount = 0;
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          const subResult = checkAssets(filePath);
          totalSize += subResult.size;
          imageCount += subResult.count;
        } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file)) {
          totalSize += stat.size;
          imageCount++;
          
          // Check for large images
          if (stat.size > 1024 * 1024) { // 1MB
            this.results.warnings.push({
              type: 'PERFORMANCE',
              message: `Large image file: ${path.relative(this.projectRoot, filePath)} (${(stat.size / 1024 / 1024).toFixed(2)}MB)`
            });
          }
        }
      }
      
      return { size: totalSize, count: imageCount };
    };

    const assetStats = checkAssets(assetsDir);
    
    this.results.metrics.assets = {
      totalSize: assetStats.size,
      imageCount: assetStats.count,
      averageSize: assetStats.count > 0 ? assetStats.size / assetStats.count : 0
    };
    
    if (assetStats.size > 10 * 1024 * 1024) { // 10MB
      this.results.warnings.push({
        type: 'BUNDLE_SIZE',
        message: `Large assets directory: ${(assetStats.size / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }

  /**
   * Check performance patterns
   */
  checkPerformancePatterns() {
    const sourceDir = path.join(this.projectRoot, 'src');
    if (!fs.existsSync(sourceDir)) return;

    const performancePatterns = [
      {
        name: 'Inline styles',
        pattern: /style=\{\{[^}]+\}\}/g,
        severity: 'warning',
        message: 'Consider moving inline styles to StyleSheet'
      },
      {
        name: 'Missing React.memo',
        pattern: /const\s+\w+:\s*React\.FC/g,
        check: (content, matches) => {
          // Check if React.memo is used
          return !content.includes('React.memo') && matches.length > 0;
        },
        severity: 'info',
        message: 'Consider using React.memo for functional components'
      },
      {
        name: 'Large useEffect dependencies',
        pattern: /useEffect\([^,]+,\s*\[[^\]]{50,}\]/g,
        severity: 'warning',
        message: 'Large useEffect dependency array detected'
      }
    ];

    const checkDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkDirectory(filePath);
        } else if (file.endsWith('.tsx')) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          for (const pattern of performancePatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
              let shouldReport = true;
              
              if (pattern.check) {
                shouldReport = pattern.check(content, matches);
              }
              
              if (shouldReport) {
                this.results.warnings.push({
                  type: 'PERFORMANCE',
                  message: `${pattern.message} in ${path.relative(this.projectRoot, filePath)}`,
                  severity: pattern.severity,
                  count: matches.length
                });
              }
            }
          }
        }
      }
    };

    checkDirectory(sourceDir);
  }

  /**
   * Check lazy loading implementation
   */
  checkLazyLoading() {
    const navigationFiles = [
      'src/navigation/AppNavigator.tsx',
      'src/navigation/TabNavigator.tsx'
    ];

    for (const file of navigationFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('React.lazy') && !content.includes('lazy(')) {
          this.results.warnings.push({
            type: 'PERFORMANCE',
            message: `Consider implementing lazy loading in ${file}`
          });
        }
      }
    }
  }

  /**
   * Analyze bundle sizes
   */
  async analyzeBundles() {
    console.log('📊 Analyzing Bundles...');
    
    try {
      // Create a production build for analysis
      console.log('Creating production build...');
      execSync('npx expo export --platform web', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      // Analyze bundle size
      const distDir = path.join(this.projectRoot, 'dist');
      if (fs.existsSync(distDir)) {
        const bundleStats = this.analyzeBundleDirectory(distDir);
        
        this.results.metrics.bundle = bundleStats;
        
        if (bundleStats.totalSize > 5 * 1024 * 1024) { // 5MB
          this.results.warnings.push({
            type: 'BUNDLE_SIZE',
            message: `Large bundle size: ${(bundleStats.totalSize / 1024 / 1024).toFixed(2)}MB`
          });
        }
        
        this.results.tests.push({
          category: 'Bundle Analysis',
          name: 'Bundle Creation',
          passed: true,
          details: `Bundle size: ${(bundleStats.totalSize / 1024 / 1024).toFixed(2)}MB`
        });
      } else {
        this.results.errors.push({
          type: 'BUNDLE_ANALYSIS',
          message: 'Bundle directory not found after build'
        });
      }
    } catch (error) {
      this.results.errors.push({
        type: 'BUNDLE_BUILD',
        message: `Failed to create production build: ${error.message}`
      });
    }
  }

  /**
   * Analyze bundle directory
   */
  analyzeBundleDirectory(dir) {
    let totalSize = 0;
    let fileCount = 0;
    const fileTypes = {};

    const analyzeDir = (currentDir) => {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          analyzeDir(filePath);
        } else {
          totalSize += stat.size;
          fileCount++;
          
          const ext = path.extname(file).toLowerCase();
          fileTypes[ext] = (fileTypes[ext] || 0) + stat.size;
        }
      }
    };

    analyzeDir(dir);
    
    return {
      totalSize,
      fileCount,
      fileTypes,
      averageFileSize: fileCount > 0 ? totalSize / fileCount : 0
    };
  }

  /**
   * Run tests
   */
  async runTests() {
    console.log('🧪 Running Tests...');
    
    // Check if test files exist
    const testDirs = [
      'src/__tests__',
      'src/services/__tests__',
      '__tests__'
    ];

    let hasTests = false;
    for (const testDir of testDirs) {
      const testPath = path.join(this.projectRoot, testDir);
      if (fs.existsSync(testPath)) {
        hasTests = true;
        break;
      }
    }

    if (!hasTests) {
      this.results.warnings.push({
        type: 'TESTING',
        message: 'No test files found'
      });
      return;
    }

    // Try to run tests if available
    try {
      execSync('npm test', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      this.results.tests.push({
        category: 'Testing',
        name: 'Unit Tests',
        passed: true,
        details: 'All tests passed'
      });
    } catch (error) {
      this.results.tests.push({
        category: 'Testing',
        name: 'Unit Tests',
        passed: false,
        details: 'Some tests failed'
      });
      
      this.results.errors.push({
        type: 'TEST_FAILURE',
        message: 'Test execution failed',
        details: error.stdout?.toString() || error.message
      });
    }
  }

  /**
   * Verify builds
   */
  async verifyBuilds() {
    console.log('🏗️ Verifying Builds...');
    
    const platforms = ['web', 'ios', 'android'];
    
    for (const platform of platforms) {
      try {
        if (platform === 'web') {
          // Web build already done in bundle analysis
          continue;
        }
        
        console.log(`Verifying ${platform} build configuration...`);
        
        // Check platform-specific configurations
        if (platform === 'ios') {
          const iosConfig = this.checkIOSConfig();
          this.results.tests.push({
            category: 'Build Verification',
            name: 'iOS Configuration',
            passed: iosConfig.valid,
            details: iosConfig.message
          });
        } else if (platform === 'android') {
          const androidConfig = this.checkAndroidConfig();
          this.results.tests.push({
            category: 'Build Verification',
            name: 'Android Configuration',
            passed: androidConfig.valid,
            details: androidConfig.message
          });
        }
      } catch (error) {
        this.results.errors.push({
          type: 'BUILD_VERIFICATION',
          message: `${platform} build verification failed: ${error.message}`
        });
      }
    }
  }

  /**
   * Check iOS configuration
   */
  checkIOSConfig() {
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
      return { valid: false, message: 'app.json not found' };
    }

    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const iosConfig = appJson.expo?.ios;
      
      if (!iosConfig) {
        return { valid: false, message: 'iOS configuration missing' };
      }
      
      const requiredFields = ['bundleIdentifier'];
      const missing = requiredFields.filter(field => !iosConfig[field]);
      
      if (missing.length > 0) {
        return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
      }
      
      return { valid: true, message: 'iOS configuration valid' };
    } catch (error) {
      return { valid: false, message: `Invalid app.json: ${error.message}` };
    }
  }

  /**
   * Check Android configuration
   */
  checkAndroidConfig() {
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
      return { valid: false, message: 'app.json not found' };
    }

    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const androidConfig = appJson.expo?.android;
      
      if (!androidConfig) {
        return { valid: false, message: 'Android configuration missing' };
      }
      
      const requiredFields = ['package'];
      const missing = requiredFields.filter(field => !androidConfig[field]);
      
      if (missing.length > 0) {
        return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
      }
      
      return { valid: true, message: 'Android configuration valid' };
    } catch (error) {
      return { valid: false, message: `Invalid app.json: ${error.message}` };
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    console.log('📋 Generating Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: this.results.tests.length,
        passed_tests: this.results.tests.filter(t => t.passed).length,
        failed_tests: this.results.tests.filter(t => !t.passed).length,
        errors: this.results.errors.length,
        warnings: this.results.warnings.length,
        optimizations: this.results.optimizations.length
      },
      metrics: this.results.metrics,
      tests: this.results.tests,
      errors: this.results.errors,
      warnings: this.results.warnings,
      optimizations: this.results.optimizations,
      recommendations: this.generateRecommendations()
    };

    // Save report to file
    const reportPath = path.join(this.projectRoot, 'production-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(this.projectRoot, 'PRODUCTION_OPTIMIZATION_REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`📊 Report saved to: ${reportPath}`);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
    
    // Print summary
    this.printSummary(report);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Based on errors
    if (this.results.errors.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Critical Issues',
        message: 'Fix all critical errors before production deployment',
        actions: ['Review error log', 'Fix type errors', 'Address security vulnerabilities']
      });
    }
    
    // Based on warnings
    if (this.results.warnings.filter(w => w.type === 'PERFORMANCE').length > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        message: 'Multiple performance issues detected',
        actions: ['Implement lazy loading', 'Optimize images', 'Use React.memo', 'Move styles to StyleSheet']
      });
    }
    
    // Based on metrics
    if (this.results.metrics.bundle?.totalSize > 5 * 1024 * 1024) {
      recommendations.push({
        priority: 'medium',
        category: 'Bundle Size',
        message: 'Bundle size is large',
        actions: ['Enable code splitting', 'Remove unused dependencies', 'Optimize images']
      });
    }
    
    if (this.results.metrics.dependencies?.total > 100) {
      recommendations.push({
        priority: 'low',
        category: 'Dependencies',
        message: 'High number of dependencies',
        actions: ['Audit dependencies', 'Remove unused packages', 'Consider alternatives']
      });
    }
    
    return recommendations;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    let markdown = `# Production Optimization Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${report.summary.total_tests}\n`;
    markdown += `- **Passed:** ${report.summary.passed_tests} ✅\n`;
    markdown += `- **Failed:** ${report.summary.failed_tests} ❌\n`;
    markdown += `- **Errors:** ${report.summary.errors} 🔴\n`;
    markdown += `- **Warnings:** ${report.summary.warnings} 🟡\n\n`;
    
    // Metrics
    if (Object.keys(report.metrics).length > 0) {
      markdown += `## Metrics\n\n`;
      
      if (report.metrics.bundle) {
        markdown += `### Bundle Analysis\n`;
        markdown += `- **Total Size:** ${(report.metrics.bundle.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
        markdown += `- **File Count:** ${report.metrics.bundle.fileCount}\n`;
        markdown += `- **Average File Size:** ${(report.metrics.bundle.averageFileSize / 1024).toFixed(2)} KB\n\n`;
      }
      
      if (report.metrics.dependencies) {
        markdown += `### Dependencies\n`;
        markdown += `- **Production:** ${report.metrics.dependencies.production}\n`;
        markdown += `- **Development:** ${report.metrics.dependencies.development}\n`;
        markdown += `- **Total:** ${report.metrics.dependencies.total}\n\n`;
      }
    }
    
    // Test Results
    if (report.tests.length > 0) {
      markdown += `## Test Results\n\n`;
      const categories = [...new Set(report.tests.map(t => t.category))];
      
      for (const category of categories) {
        markdown += `### ${category}\n\n`;
        const categoryTests = report.tests.filter(t => t.category === category);
        
        for (const test of categoryTests) {
          const icon = test.passed ? '✅' : '❌';
          markdown += `- ${icon} **${test.name}:** ${test.details}\n`;
        }
        markdown += '\n';
      }
    }
    
    // Errors
    if (report.errors.length > 0) {
      markdown += `## Errors\n\n`;
      for (const error of report.errors) {
        markdown += `### ${error.type}\n`;
        markdown += `${error.message}\n\n`;
        if (error.details) {
          markdown += `\`\`\`\n${typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }
    
    // Warnings
    if (report.warnings.length > 0) {
      markdown += `## Warnings\n\n`;
      for (const warning of report.warnings) {
        markdown += `- **${warning.type}:** ${warning.message}\n`;
      }
      markdown += '\n';
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      for (const rec of report.recommendations) {
        markdown += `### ${rec.category} (${rec.priority} priority)\n`;
        markdown += `${rec.message}\n\n`;
        markdown += `**Actions:**\n`;
        for (const action of rec.actions) {
          markdown += `- ${action}\n`;
        }
        markdown += '\n';
      }
    }
    
    return markdown;
  }

  /**
   * Print summary to console
   */
  printSummary(report) {
    console.log('\n📊 OPTIMIZATION SUMMARY');
    console.log('========================');
    console.log(`Tests: ${report.summary.passed_tests}/${report.summary.total_tests} passed`);
    console.log(`Errors: ${report.summary.errors}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    
    if (report.metrics.bundle) {
      console.log(`Bundle Size: ${(report.metrics.bundle.totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    if (report.summary.errors === 0) {
      console.log('\n✅ Ready for production deployment!');
    } else {
      console.log('\n⚠️  Please address errors before production deployment.');
    }
    
    console.log('\n📋 See PRODUCTION_OPTIMIZATION_REPORT.md for detailed report.');
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new ProductionOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = ProductionOptimizer;