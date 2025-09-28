#!/usr/bin/env node

/**
 * DevContainer Support Analytics and Feedback System
 *
 * Automated feedback collection, sentiment analysis, and adoption metrics
 * processing to measure DevContainer adoption success and identify improvement areas.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface FeedbackEntry {
	feedbackId: string;
	userId: string;
	issueId?: string;
	timestamp: Date;
	category: 'general' | 'issue-resolution' | 'documentation' | 'training' | 'performance';
	rating: number; // 1-5 scale
	comments: string;
	sentiment: 'positive' | 'neutral' | 'negative';
	metadata: {
		userExperience: 'beginner' | 'intermediate' | 'advanced';
		timeToResolution?: number;
		selfServiceResolution: boolean;
		source: 'survey' | 'chat' | 'github' | 'direct' | 'usage-analytics';
		tags: string[];
	};
}

interface AdoptionMetrics {
	period: string; // YYYY-MM-DD or YYYY-MM
	totalUsers: number;
	activeUsers: number;
	onboardingTime: {
		average: number;
		median: number;
		p95: number;
	};
	selfServiceResolution: {
		rate: number; // percentage
		totalIssues: number;
		resolvedWithoutHuman: number;
	};
	satisfactionScores: {
		overall: number;
		byCategory: Record<string, number>;
		trend: number[]; // last 30 days
	};
	issueMetrics: {
		totalIssues: number;
		averageResolutionTime: number;
		escalationRate: number;
		commonCategories: Array<{ category: string; count: number }>;
	};
	performanceMetrics: {
		buildTime: number;
		testTime: number;
		startupTime: number;
		resourceUsage: {
			cpu: number;
			memory: number;
			disk: number;
		};
	};
}

interface AnalyticsDashboard {
	generatedAt: Date;
	period: string;
	summary: {
		overallHealth: 'excellent' | 'good' | 'needs-attention' | 'critical';
		keyInsights: string[];
		recommendations: string[];
	};
	metrics: AdoptionMetrics;
	trends: {
		userGrowth: number;
		satisfactionTrend: number;
		resolutionTimeTrend: number;
		selfServiceTrend: number;
	};
	alerts: Array<{
		type: 'warning' | 'critical' | 'info';
		message: string;
		metric: string;
		threshold: number;
		current: number;
	}>;
}

class DevContainerAnalyticsSystem {
	private feedbackEntries: FeedbackEntry[] = [];
	private adoptionMetrics: AdoptionMetrics[] = [];
	private dashboardCache: AnalyticsDashboard | null = null;
	private feedbackCollectionInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.loadFeedbackData();
		this.loadMetricsData();
		this.initializeAutomatedCollection();
	}

	private loadFeedbackData(): void {
		const feedbackFile = path.join(process.cwd(), 'feedback-data.json');
		if (fs.existsSync(feedbackFile)) {
			try {
				this.feedbackEntries = JSON.parse(fs.readFileSync(feedbackFile, 'utf8')).map(
					(entry: any) => ({
						...entry,
						timestamp: new Date(entry.timestamp),
					}),
				);
			} catch (error) {
				console.warn('Failed to load feedback data');
			}
		}
	}

	private loadMetricsData(): void {
		const metricsFile = path.join(process.cwd(), 'adoption-metrics.json');
		if (fs.existsSync(metricsFile)) {
			try {
				this.adoptionMetrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
			} catch (error) {
				console.warn('Failed to load metrics data');
			}
		}
	}

	private saveFeedbackData(): void {
		const feedbackFile = path.join(process.cwd(), 'feedback-data.json');
		fs.writeFileSync(feedbackFile, JSON.stringify(this.feedbackEntries, null, 2));
	}

	private saveMetricsData(): void {
		const metricsFile = path.join(process.cwd(), 'adoption-metrics.json');
		fs.writeFileSync(metricsFile, JSON.stringify(this.adoptionMetrics, null, 2));
	}

	private initializeAutomatedCollection(): void {
		// Collect feedback every 6 hours
		this.feedbackCollectionInterval = setInterval(
			() => {
				this.collectAutomatedFeedback();
			},
			6 * 60 * 60 * 1000,
		);

		// Generate daily metrics
		setInterval(
			() => {
				this.generateDailyMetrics();
			},
			24 * 60 * 60 * 1000,
		);
	}

	public async collectFeedback(
		entry: Omit<FeedbackEntry, 'feedbackId' | 'timestamp' | 'sentiment'>,
	): Promise<void> {
		const feedbackEntry: FeedbackEntry = {
			...entry,
			feedbackId: this.generateFeedbackId(),
			timestamp: new Date(),
			sentiment: this.analyzeSentiment(entry.comments),
		};

		this.feedbackEntries.push(feedbackEntry);
		this.saveFeedbackData();

		console.log(`📝 Collected feedback from ${entry.userId} (${entry.rating}/5)`);

		// Check for alerts based on feedback
		await this.checkFeedbackAlerts(feedbackEntry);
	}

	private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
		const positiveWords = [
			'great',
			'excellent',
			'amazing',
			'love',
			'perfect',
			'helpful',
			'easy',
			'fast',
			'smooth',
		];
		const negativeWords = [
			'terrible',
			'awful',
			'hate',
			'difficult',
			'slow',
			'broken',
			'confusing',
			'frustrating',
			'useless',
		];

		const lowerText = text.toLowerCase();
		let positiveScore = 0;
		let negativeScore = 0;

		positiveWords.forEach((word) => {
			if (lowerText.includes(word)) positiveScore++;
		});

		negativeWords.forEach((word) => {
			if (lowerText.includes(word)) negativeScore++;
		});

		if (positiveScore > negativeScore) return 'positive';
		if (negativeScore > positiveScore) return 'negative';
		return 'neutral';
	}

	private async checkFeedbackAlerts(feedback: FeedbackEntry): Promise<void> {
		// Alert on low ratings
		if (feedback.rating <= 2) {
			console.log(`🚨 ALERT: Low rating (${feedback.rating}/5) from ${feedback.userId}`);
			console.log(`   Comment: ${feedback.comments}`);

			// In a real system, this would trigger notifications
			await this.createImprovementTicket(feedback);
		}

		// Alert on negative sentiment with high rating (inconsistency)
		if (feedback.sentiment === 'negative' && feedback.rating >= 4) {
			console.log(`⚠️  ALERT: Sentiment mismatch - negative comment with high rating`);
			console.log(`   User: ${feedback.userId}, Rating: ${feedback.rating}`);
		}
	}

	private async createImprovementTicket(feedback: FeedbackEntry): Promise<void> {
		// Create a ticket for improvement based on feedback
		const ticketData = {
			title: `DevContainer Improvement: ${feedback.category}`,
			description: `Feedback from ${feedback.userId}: ${feedback.comments}`,
			priority: feedback.rating <= 1 ? 'high' : 'medium',
			tags: ['feedback', feedback.category, ...feedback.metadata.tags],
		};

		console.log(`🎫 Created improvement ticket: ${ticketData.title}`);
		// In a real system, this would integrate with issue tracking
	}

	private async collectAutomatedFeedback(): Promise<void> {
		// Collect feedback from various sources
		console.log('🔄 Collecting automated feedback...');

		try {
			// Collect from GitHub issues
			await this.collectGitHubFeedback();

			// Collect from chat logs (if available)
			await this.collectChatFeedback();

			// Collect from usage metrics
			await this.collectUsageFeedback();
		} catch (error) {
			console.error('Failed to collect automated feedback:', error);
		}
	}

	private async collectGitHubFeedback(): Promise<void> {
		// In a real implementation, this would query GitHub API for issues and comments
		console.log('   📋 Collecting GitHub feedback...');
		// Mock implementation - would integrate with GitHub API
	}

	private async collectChatFeedback(): Promise<void> {
		// Collect feedback from support chat interactions
		console.log('   💬 Collecting chat feedback...');
		// Mock implementation - would integrate with chat system
	}

	private async collectUsageFeedback(): Promise<void> {
		// Analyze usage patterns to infer satisfaction
		console.log('   📊 Analyzing usage patterns...');

		const recentUsage = await this.getRecentUsageMetrics();
		const inferredFeedback = this.inferFeedbackFromUsage(recentUsage);

		for (const feedback of inferredFeedback) {
			await this.collectFeedback(feedback);
		}
	}

	private async getRecentUsageMetrics(): Promise<any> {
		// Get recent usage data
		// In a real implementation, this would query usage analytics
		return {
			activeUsers: 150,
			sessionDuration: 45, // minutes
			errorRate: 0.02,
			featureUsage: {
				diagnostics: 85,
				knowledgeBase: 60,
				escalation: 15,
			},
		};
	}

	private inferFeedbackFromUsage(
		usage: any,
	): Omit<FeedbackEntry, 'feedbackId' | 'timestamp' | 'sentiment'>[] {
		const feedback: Omit<FeedbackEntry, 'feedbackId' | 'timestamp' | 'sentiment'>[] = [];

		// Infer satisfaction from usage patterns
		if (usage.errorRate < 0.05) {
			feedback.push({
				userId: 'system-inferred',
				category: 'performance',
				rating: 5,
				comments: 'Low error rate indicates good system stability',
				metadata: {
					userExperience: 'intermediate',
					selfServiceResolution: true,
					source: 'usage-analytics',
					tags: ['stability', 'performance'],
				},
			});
		}

		if (usage.featureUsage.knowledgeBase > 70) {
			feedback.push({
				userId: 'system-inferred',
				category: 'documentation',
				rating: 4,
				comments: 'High knowledge base usage suggests good documentation',
				metadata: {
					userExperience: 'intermediate',
					selfServiceResolution: true,
					source: 'usage-analytics',
					tags: ['documentation', 'self-service'],
				},
			});
		}

		return feedback;
	}

	private async generateDailyMetrics(): Promise<void> {
		console.log('📊 Generating daily adoption metrics...');

		const today = new Date().toISOString().split('T')[0];
		const metrics = await this.calculateAdoptionMetrics(today);

		this.adoptionMetrics.push(metrics);
		this.saveMetricsData();

		// Generate dashboard
		this.dashboardCache = await this.generateAnalyticsDashboard(today);

		// Check for alerts
		await this.checkMetricsAlerts(metrics);
	}

	private async calculateAdoptionMetrics(period: string): Promise<AdoptionMetrics> {
		// Calculate metrics for the given period
		const periodFeedback = this.feedbackEntries.filter((entry) =>
			entry.timestamp.toISOString().startsWith(period),
		);

		const totalUsers = await this.getTotalUsers();
		const activeUsers = await this.getActiveUsers(period);

		const onboardingTimes = await this.getOnboardingTimes(period);
		const selfServiceData = this.calculateSelfServiceMetrics(periodFeedback);
		const satisfactionData = this.calculateSatisfactionMetrics(periodFeedback);
		const issueData = await this.getIssueMetrics(period);
		const performanceData = await this.getPerformanceMetrics(period);

		return {
			period,
			totalUsers,
			activeUsers,
			onboardingTime: onboardingTimes,
			selfServiceResolution: selfServiceData,
			satisfactionScores: satisfactionData,
			issueMetrics: issueData,
			performanceMetrics: performanceData,
		};
	}

	private async getTotalUsers(): Promise<number> {
		// In a real implementation, this would query user database
		return 500; // Mock value
	}

	private async getActiveUsers(period: string): Promise<number> {
		// Calculate active users for the period
		const periodStart = new Date(period);
		const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

		const activeUserIds = new Set(
			this.feedbackEntries
				.filter((entry) => entry.timestamp >= periodStart && entry.timestamp < periodEnd)
				.map((entry) => entry.userId),
		);

		return activeUserIds.size;
	}

	private async getOnboardingTimes(
		period: string,
	): Promise<{ average: number; median: number; p95: number }> {
		// In a real implementation, this would query onboarding analytics
		return {
			average: 25, // minutes
			median: 20,
			p95: 45,
		};
	}

	private calculateSelfServiceMetrics(feedback: FeedbackEntry[]): {
		rate: number;
		totalIssues: number;
		resolvedWithoutHuman: number;
	} {
		const totalIssues = feedback.filter((f) => f.issueId).length;
		const resolvedWithoutHuman = feedback.filter(
			(f) => f.metadata.selfServiceResolution && f.rating >= 4,
		).length;

		return {
			rate: totalIssues > 0 ? (resolvedWithoutHuman / totalIssues) * 100 : 0,
			totalIssues,
			resolvedWithoutHuman,
		};
	}

	private calculateSatisfactionMetrics(feedback: FeedbackEntry[]): {
		overall: number;
		byCategory: Record<string, number>;
		trend: number[];
	} {
		const ratings = feedback.map((f) => f.rating);
		const overall =
			ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

		const byCategory: Record<string, number> = {};
		const categoryGroups = feedback.reduce(
			(acc, f) => {
				if (!acc[f.category]) acc[f.category] = [];
				acc[f.category].push(f.rating);
				return acc;
			},
			{} as Record<string, number[]>,
		);

		Object.entries(categoryGroups).forEach(([category, ratings]) => {
			byCategory[category] = ratings.reduce((a, b) => a + b, 0) / ratings.length;
		});

		// Calculate trend (last 30 days, simplified)
		const trend = ratings.slice(-30);

		return { overall, byCategory, trend };
	}

	private async getIssueMetrics(period: string): Promise<{
		totalIssues: number;
		averageResolutionTime: number;
		escalationRate: number;
		commonCategories: Array<{ category: string; count: number }>;
	}> {
		// In a real implementation, this would query issue tracking system
		const categoryCounts = this.feedbackEntries
			.filter((f) => f.category !== 'general')
			.reduce(
				(acc, f) => {
					acc[f.category] = (acc[f.category] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

		const commonCategories = Object.entries(categoryCounts)
			.map(([category, count]) => ({ category, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		return {
			totalIssues: 150,
			averageResolutionTime: 45, // minutes
			escalationRate: 15, // percentage
			commonCategories,
		};
	}

	private async getPerformanceMetrics(period: string): Promise<{
		buildTime: number;
		testTime: number;
		startupTime: number;
		resourceUsage: { cpu: number; memory: number; disk: number };
	}> {
		// In a real implementation, this would collect performance metrics
		return {
			buildTime: 120, // seconds
			testTime: 180, // seconds
			startupTime: 15, // seconds
			resourceUsage: {
				cpu: 65, // percentage
				memory: 2.1, // GB
				disk: 1.8, // GB
			},
		};
	}

	private async generateAnalyticsDashboard(period: string): Promise<AnalyticsDashboard> {
		const metrics = this.adoptionMetrics[this.adoptionMetrics.length - 1];
		if (!metrics) {
			throw new Error('No metrics available for dashboard generation');
		}

		const summary = this.generateDashboardSummary(metrics);
		const trends = this.calculateTrends();
		const alerts = this.generateAlerts(metrics);

		return {
			generatedAt: new Date(),
			period,
			summary,
			metrics,
			trends,
			alerts,
		};
	}

	private generateDashboardSummary(metrics: AdoptionMetrics): {
		overallHealth: 'excellent' | 'good' | 'needs-attention' | 'critical';
		keyInsights: string[];
		recommendations: string[];
	} {
		const insights: string[] = [];
		const recommendations: string[] = [];
		let health: 'excellent' | 'good' | 'needs-attention' | 'critical' = 'good';

		// Analyze self-service resolution rate
		if (metrics.selfServiceResolution.rate >= 95) {
			insights.push('🎯 Excellent self-service resolution rate meeting target');
		} else if (metrics.selfServiceResolution.rate >= 85) {
			insights.push('📈 Good progress toward self-service target');
		} else {
			insights.push('⚠️ Self-service resolution below target');
			recommendations.push('Enhance knowledge base and AI assistance');
			health = 'needs-attention';
		}

		// Analyze satisfaction scores
		if (metrics.satisfactionScores.overall >= 4.5) {
			insights.push('😊 High user satisfaction scores');
		} else if (metrics.satisfactionScores.overall >= 4.0) {
			insights.push('🙂 Good user satisfaction');
		} else {
			insights.push('😞 User satisfaction needs improvement');
			recommendations.push('Address common pain points identified in feedback');
			health = 'needs-attention';
		}

		// Analyze onboarding time
		if (metrics.onboardingTime.average <= 30) {
			insights.push('⚡ Fast onboarding times achieved');
		} else {
			insights.push('⏱️ Onboarding times could be improved');
			recommendations.push('Streamline setup process and documentation');
		}

		// Analyze issue metrics
		if (metrics.issueMetrics.escalationRate <= 10) {
			insights.push('🔧 Low escalation rate indicates effective self-service');
		} else {
			insights.push('📞 High escalation rate suggests need for better support');
			recommendations.push('Improve first-line support and knowledge base');
			health = 'needs-attention';
		}

		// Determine overall health
		if (
			metrics.selfServiceResolution.rate >= 95 &&
			metrics.satisfactionScores.overall >= 4.5 &&
			metrics.onboardingTime.average <= 30
		) {
			health = 'excellent';
		} else if (
			health === 'good' &&
			(metrics.selfServiceResolution.rate < 80 || metrics.satisfactionScores.overall < 3.5)
		) {
			health = 'critical';
		}

		return { overallHealth: health, keyInsights: insights, recommendations };
	}

	private calculateTrends(): {
		userGrowth: number;
		satisfactionTrend: number;
		resolutionTimeTrend: number;
		selfServiceTrend: number;
	} {
		const recent = this.adoptionMetrics.slice(-7); // Last 7 periods

		if (recent.length < 2) {
			return {
				userGrowth: 0,
				satisfactionTrend: 0,
				resolutionTimeTrend: 0,
				selfServiceTrend: 0,
			};
		}

		const current = recent[recent.length - 1];
		const previous = recent[recent.length - 2];

		return {
			userGrowth:
				((current.activeUsers - previous.activeUsers) / previous.activeUsers) * 100,
			satisfactionTrend:
				current.satisfactionScores.overall - previous.satisfactionScores.overall,
			resolutionTimeTrend:
				previous.issueMetrics.averageResolutionTime -
				current.issueMetrics.averageResolutionTime,
			selfServiceTrend:
				current.selfServiceResolution.rate - previous.selfServiceResolution.rate,
		};
	}

	private generateAlerts(metrics: AdoptionMetrics): Array<{
		type: 'warning' | 'critical' | 'info';
		message: string;
		metric: string;
		threshold: number;
		current: number;
	}> {
		const alerts: Array<{
			type: 'warning' | 'critical' | 'info';
			message: string;
			metric: string;
			threshold: number;
			current: number;
		}> = [];

		// Self-service resolution alert
		if (metrics.selfServiceResolution.rate < 85) {
			alerts.push({
				type: 'critical',
				message: 'Self-service resolution rate below target',
				metric: 'selfServiceResolution.rate',
				threshold: 95,
				current: metrics.selfServiceResolution.rate,
			});
		} else if (metrics.selfServiceResolution.rate < 90) {
			alerts.push({
				type: 'warning',
				message: 'Self-service resolution rate approaching target',
				metric: 'selfServiceResolution.rate',
				threshold: 95,
				current: metrics.selfServiceResolution.rate,
			});
		}

		// Satisfaction alert
		if (metrics.satisfactionScores.overall < 4.0) {
			alerts.push({
				type: 'critical',
				message: 'User satisfaction below acceptable threshold',
				metric: 'satisfactionScores.overall',
				threshold: 4.5,
				current: metrics.satisfactionScores.overall,
			});
		} else if (metrics.satisfactionScores.overall < 4.3) {
			alerts.push({
				type: 'warning',
				message: 'User satisfaction below target',
				metric: 'satisfactionScores.overall',
				threshold: 4.5,
				current: metrics.satisfactionScores.overall,
			});
		}

		// Onboarding time alert
		if (metrics.onboardingTime.average > 45) {
			alerts.push({
				type: 'warning',
				message: 'Average onboarding time exceeds target',
				metric: 'onboardingTime.average',
				threshold: 30,
				current: metrics.onboardingTime.average,
			});
		}

		return alerts;
	}

	private async checkMetricsAlerts(metrics: AdoptionMetrics): Promise<void> {
		const alerts = this.generateAlerts(metrics);

		for (const alert of alerts) {
			console.log(`🚨 ${alert.type.toUpperCase()}: ${alert.message}`);
			console.log(`   ${alert.metric}: ${alert.current} (target: ${alert.threshold})`);

			// In a real system, this would trigger notifications
		}
	}

	public getAnalyticsDashboard(): AnalyticsDashboard | null {
		return this.dashboardCache;
	}

	public getFeedbackSummary(period?: string): {
		totalFeedback: number;
		averageRating: number;
		sentimentDistribution: Record<string, number>;
		categoryDistribution: Record<string, number>;
		recentFeedback: FeedbackEntry[];
	} {
		let feedback = this.feedbackEntries;

		if (period) {
			const periodStart = new Date(period);
			const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
			feedback = feedback.filter(
				(entry) => entry.timestamp >= periodStart && entry.timestamp < periodEnd,
			);
		}

		const ratings = feedback.map((f) => f.rating);
		const averageRating =
			ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

		const sentimentDistribution = feedback.reduce(
			(acc, f) => {
				acc[f.sentiment] = (acc[f.sentiment] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const categoryDistribution = feedback.reduce(
			(acc, f) => {
				acc[f.category] = (acc[f.category] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const recentFeedback = feedback
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, 10);

		return {
			totalFeedback: feedback.length,
			averageRating,
			sentimentDistribution,
			categoryDistribution,
			recentFeedback,
		};
	}

	private generateFeedbackId(): string {
		return 'FB-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	public cleanup(): void {
		if (this.feedbackCollectionInterval) {
			clearInterval(this.feedbackCollectionInterval);
		}
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const analyticsSystem = new DevContainerAnalyticsSystem();

	if (args.length === 0) {
		console.log('DevContainer Analytics System');
		console.log('==============================\n');
		console.log('Usage:');
		console.log('  feedback <user-id> <category> <rating> <comments> - Add feedback');
		console.log(
			'  dashboard                                              - Show analytics dashboard',
		);
		console.log(
			'  summary [period]                                       - Show feedback summary',
		);
		console.log(
			'  alerts                                                 - Show current alerts',
		);
		console.log(
			'  collect                                                - Trigger automated collection',
		);
		return;
	}

	const command = args[0];

	try {
		switch (command) {
			case 'feedback': {
				const [_, userId, category, ratingStr, ...commentParts] = args;
				const comments = commentParts.join(' ');

				await analyticsSystem.collectFeedback({
					userId,
					category: category as any,
					rating: parseInt(ratingStr),
					comments,
					metadata: {
						userExperience: 'intermediate',
						selfServiceResolution: true,
						source: 'direct',
						tags: [],
					},
				});

				console.log('Feedback collected successfully');
				break;
			}

			case 'dashboard': {
				const dashboard = analyticsSystem.getAnalyticsDashboard();
				if (!dashboard) {
					console.log('No dashboard available. Run metrics collection first.');
					break;
				}

				console.log('DevContainer Adoption Dashboard');
				console.log('===============================\n');
				console.log(`Period: ${dashboard.period}`);
				console.log(`Overall Health: ${dashboard.summary.overallHealth.toUpperCase()}\n`);

				console.log('Key Insights:');
				dashboard.summary.keyInsights.forEach((insight) => console.log(`• ${insight}`));
				console.log('');

				console.log('Recommendations:');
				dashboard.summary.recommendations.forEach((rec) => console.log(`• ${rec}`));
				console.log('');

				console.log('Key Metrics:');
				console.log(`• Total Users: ${dashboard.metrics.totalUsers}`);
				console.log(`• Active Users: ${dashboard.metrics.activeUsers}`);
				console.log(
					`• Self-Service Resolution: ${dashboard.metrics.selfServiceResolution.rate.toFixed(1)}%`,
				);
				console.log(
					`• Average Satisfaction: ${dashboard.metrics.satisfactionScores.overall.toFixed(1)}/5`,
				);
				console.log(
					`• Average Onboarding Time: ${dashboard.metrics.onboardingTime.average} min`,
				);
				console.log(
					`• Average Resolution Time: ${dashboard.metrics.issueMetrics.averageResolutionTime} min`,
				);
				console.log('');

				if (dashboard.alerts.length > 0) {
					console.log('Active Alerts:');
					dashboard.alerts.forEach((alert) => {
						console.log(`🚨 ${alert.type.toUpperCase()}: ${alert.message}`);
						console.log(`   ${alert.current} (target: ${alert.threshold})`);
					});
				}
				break;
			}

			case 'summary': {
				const period = args[1];
				const summary = analyticsSystem.getFeedbackSummary(period);

				console.log('Feedback Summary');
				console.log('================\n');
				console.log(`Total Feedback: ${summary.totalFeedback}`);
				console.log(`Average Rating: ${summary.averageRating.toFixed(1)}/5\n`);

				console.log('Sentiment Distribution:');
				Object.entries(summary.sentimentDistribution).forEach(([sentiment, count]) => {
					console.log(`  ${sentiment}: ${count}`);
				});
				console.log('');

				console.log('Category Distribution:');
				Object.entries(summary.categoryDistribution).forEach(([category, count]) => {
					console.log(`  ${category}: ${count}`);
				});
				console.log('');

				console.log('Recent Feedback:');
				summary.recentFeedback.slice(0, 5).forEach((feedback) => {
					console.log(
						`• ${feedback.userId}: ${feedback.rating}/5 - ${feedback.comments.substring(0, 50)}...`,
					);
				});
				break;
			}

			case 'alerts': {
				const dashboard = analyticsSystem.getAnalyticsDashboard();
				if (!dashboard) {
					console.log('No dashboard available.');
					break;
				}

				console.log('Current Alerts');
				console.log('==============\n');

				if (dashboard.alerts.length === 0) {
					console.log('✅ No active alerts');
				} else {
					dashboard.alerts.forEach((alert) => {
						console.log(`${alert.type === 'critical' ? '🚨' : '⚠️'} ${alert.message}`);
						console.log(`   Current: ${alert.current}, Target: ${alert.threshold}\n`);
					});
				}
				break;
			}

			case 'collect': {
				console.log('🔄 Triggering automated feedback collection...');
				await analyticsSystem['collectAutomatedFeedback']();
				console.log('✅ Collection completed');
				break;
			}

			default:
				console.error(`Unknown command: ${command}`);
		}
	} catch (error: any) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	} finally {
		analyticsSystem.cleanup();
	}
}

// Export for programmatic use
export { DevContainerAnalyticsSystem, FeedbackEntry, AdoptionMetrics, AnalyticsDashboard };

// Run CLI if called directly
if (require.main === module) {
	main().catch(console.error);
}
