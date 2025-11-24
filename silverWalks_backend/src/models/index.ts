import User from './User.model';
import ElderlyProfile from './ElderlyProfile.model';
import NurseProfile from './NurseProfile.model';
import HealthProfile from './HealthProfile.model';
import EmergencyContact from './EmergencyContact.model';
import NurseBankAccount from './NurseBankAccount.model';
import WalkSession from './WalkSession.model';
import Activity from './Activity.model';
import ActivityParticipant from './ActivityParticipant.model';
import ActivityLog from './ActivityLog.model';
import Notification from './Notification.model';
import EmergencyAlert from './EmergencyAlert.model';
import NurseAvailability from './NurseAvailability.model';
import WithdrawalRequest from './WithdrawalRequest.model';
import Subscription from './Subscription.model';
import Payment from './Payment.model';
import AdminAction from './AdminAction.model';

// Define associations

// User associations
User.hasOne(ElderlyProfile, {
  foreignKey: 'user_id',
  as: 'elderlyProfile',
  onDelete: 'CASCADE',
});

User.hasOne(NurseProfile, {
  foreignKey: 'user_id',
  as: 'nurseProfile',
  onDelete: 'CASCADE',
});

User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
  onDelete: 'CASCADE',
});

User.hasMany(Activity, {
  foreignKey: 'created_by',
  as: 'createdActivities',
});

User.hasMany(ActivityLog, {
  foreignKey: 'logged_by',
  as: 'activityLogs',
});

User.hasMany(AdminAction, {
  foreignKey: 'admin_id',
  as: 'adminActions',
});

// ElderlyProfile associations
ElderlyProfile.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

ElderlyProfile.hasOne(HealthProfile, {
  foreignKey: 'elderly_id',
  as: 'healthProfile',
  onDelete: 'CASCADE',
});

ElderlyProfile.hasMany(EmergencyContact, {
  foreignKey: 'elderly_id',
  as: 'emergencyContacts',
  onDelete: 'CASCADE',
});

ElderlyProfile.belongsTo(NurseProfile, {
  foreignKey: 'assigned_nurse_id',
  as: 'assignedNurse',
});

ElderlyProfile.hasMany(WalkSession, {
  foreignKey: 'elderly_id',
  as: 'walkSessions',
});

ElderlyProfile.hasMany(ActivityParticipant, {
  foreignKey: 'elderly_id',
  as: 'activityParticipations',
  onDelete: 'CASCADE',
});

ElderlyProfile.hasMany(ActivityLog, {
  foreignKey: 'elderly_id',
  as: 'activityLogs',
  onDelete: 'CASCADE',
});

ElderlyProfile.hasMany(EmergencyAlert, {
  foreignKey: 'elderly_id',
  as: 'emergencyAlerts',
});

ElderlyProfile.hasMany(Subscription, {
  foreignKey: 'elderly_id',
  as: 'subscriptions',
  onDelete: 'CASCADE',
});

ElderlyProfile.hasMany(Payment, {
  foreignKey: 'elderly_id',
  as: 'payments',
});

// NurseProfile associations
NurseProfile.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

NurseProfile.hasMany(ElderlyProfile, {
  foreignKey: 'assigned_nurse_id',
  as: 'assignedElderlyProfiles',
});

NurseProfile.hasMany(NurseBankAccount, {
  foreignKey: 'nurse_id',
  as: 'bankAccounts',
  onDelete: 'CASCADE',
});

NurseProfile.hasMany(WalkSession, {
  foreignKey: 'nurse_id',
  as: 'walkSessions',
});

NurseProfile.hasMany(EmergencyAlert, {
  foreignKey: 'nurse_id',
  as: 'emergencyAlerts',
});

NurseProfile.hasMany(NurseAvailability, {
  foreignKey: 'nurse_id',
  as: 'availability',
  onDelete: 'CASCADE',
});

NurseProfile.hasMany(WithdrawalRequest, {
  foreignKey: 'nurse_id',
  as: 'withdrawalRequests',
});

// HealthProfile associations
HealthProfile.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

// EmergencyContact associations
EmergencyContact.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

// NurseBankAccount associations
NurseBankAccount.belongsTo(NurseProfile, {
  foreignKey: 'nurse_id',
  as: 'nurseProfile',
});

NurseBankAccount.hasMany(WithdrawalRequest, {
  foreignKey: 'bank_account_id',
  as: 'withdrawalRequests',
});

// WalkSession associations
WalkSession.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

WalkSession.belongsTo(NurseProfile, {
  foreignKey: 'nurse_id',
  as: 'nurseProfile',
});

WalkSession.hasMany(EmergencyAlert, {
  foreignKey: 'walk_session_id',
  as: 'emergencyAlerts',
});

// Activity associations
Activity.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});

Activity.hasMany(ActivityParticipant, {
  foreignKey: 'activity_id',
  as: 'participants',
  onDelete: 'CASCADE',
});

Activity.hasMany(ActivityLog, {
  foreignKey: 'activity_id',
  as: 'logs',
  onDelete: 'CASCADE',
});

// ActivityParticipant associations
ActivityParticipant.belongsTo(Activity, {
  foreignKey: 'activity_id',
  as: 'activity',
});

ActivityParticipant.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

// ActivityLog associations
ActivityLog.belongsTo(Activity, {
  foreignKey: 'activity_id',
  as: 'activity',
});

ActivityLog.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

ActivityLog.belongsTo(User, {
  foreignKey: 'logged_by',
  as: 'logger',
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// EmergencyAlert associations
EmergencyAlert.belongsTo(WalkSession, {
  foreignKey: 'walk_session_id',
  as: 'walkSession',
});

EmergencyAlert.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

EmergencyAlert.belongsTo(NurseProfile, {
  foreignKey: 'nurse_id',
  as: 'nurseProfile',
});

EmergencyAlert.belongsTo(User, {
  foreignKey: 'resolved_by',
  as: 'resolver',
});

// NurseAvailability associations
NurseAvailability.belongsTo(NurseProfile, {
  foreignKey: 'nurse_id',
  as: 'nurseProfile',
});

// WithdrawalRequest associations
WithdrawalRequest.belongsTo(NurseProfile, {
  foreignKey: 'nurse_id',
  as: 'nurseProfile',
});

WithdrawalRequest.belongsTo(NurseBankAccount, {
  foreignKey: 'bank_account_id',
  as: 'bankAccount',
});

WithdrawalRequest.belongsTo(User, {
  foreignKey: 'processed_by',
  as: 'processor',
});

// Subscription associations
Subscription.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

Subscription.hasMany(Payment, {
  foreignKey: 'subscription_id',
  as: 'payments',
});

// Payment associations
Payment.belongsTo(ElderlyProfile, {
  foreignKey: 'elderly_id',
  as: 'elderlyProfile',
});

Payment.belongsTo(Subscription, {
  foreignKey: 'subscription_id',
  as: 'subscription',
});

// AdminAction associations
AdminAction.belongsTo(User, {
  foreignKey: 'admin_id',
  as: 'admin',
});

AdminAction.belongsTo(User, {
  foreignKey: 'target_user_id',
  as: 'targetUser',
});

export {
  User,
  ElderlyProfile,
  NurseProfile,
  HealthProfile,
  EmergencyContact,
  NurseBankAccount,
  WalkSession,
  Activity,
  ActivityParticipant,
  ActivityLog,
  Notification,
  EmergencyAlert,
  NurseAvailability,
  WithdrawalRequest,
  Subscription,
  Payment,
  AdminAction,
};

export default {
  User,
  ElderlyProfile,
  NurseProfile,
  HealthProfile,
  EmergencyContact,
  NurseBankAccount,
  WalkSession,
  Activity,
  ActivityParticipant,
  ActivityLog,
  Notification,
  EmergencyAlert,
  NurseAvailability,
  WithdrawalRequest,
  Subscription,
  Payment,
  AdminAction,
};