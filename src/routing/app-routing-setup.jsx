import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import {
  AccountActivityPage,
  AccountAllowedIPAddressesPage,
  AccountApiKeysPage,
  AccountAppearancePage,
  AccountBackupAndRecoveryPage,
  AccountBasicPage,
  AccountCompanyProfilePage,
  AccountCurrentSessionsPage,
  AccountDeviceManagementPage,
  AccountEnterprisePage,
  AccountGetStartedPage,
  AccountHistoryPage,
  AccountImportMembersPage,
  AccountIntegrationsPage,
  AccountInviteAFriendPage,
  AccountMembersStarterPage,
  AccountNotificationsPage,
  AccountOverviewPage,
  AccountPermissionsCheckPage,
  AccountPermissionsTogglePage,
  AccountPlansPage,
  AccountPrivacySettingsPage,
  AccountRolesPage,
  AccountSecurityGetStartedPage,
  AccountSecurityLogPage,
  AccountSettingsEnterprisePage,
  AccountSettingsModalPage,
  AccountSettingsPlainPage,
  AccountSettingsSidebarPage,
  AccountTeamInfoPage,
  AccountTeamMembersPage,
  AccountTeamsPage,
  AccountTeamsStarterPage,
  AccountUserProfilePage,
} from '@/pages/account';
import {
  AuthAccountDeactivatedPage,
  AuthWelcomeMessagePage,
} from '@/pages/auth';
import { Demo1DarkSidebarPage } from '@/pages/dashboards';
import {
  NetworkAppRosterPage,
  NetworkAuthorPage,
  NetworkGetStartedPage,
  NetworkMarketAuthorsPage,
  NetworkMiniCardsPage,
  NetworkNFTPage,
  NetworkSaasUsersPage,
  NetworkSocialPage,
  NetworkStoreClientsPage,
  NetworkUserCardsTeamCrewPage,
  NetworkUserTableTeamCrewPage,
  NetworkVisitorsPage,
} from '@/pages/network';
import {
  CampaignsCardPage,
  CampaignsListPage,
  ProfileActivityPage,
  ProfileBloggerPage,
  ProfileCompanyPage,
  ProfileCreatorPage,
  ProfileCRMPage,
  ProfileDefaultPage,
  ProfileEmptyPage,
  ProfileFeedsPage,
  ProfileGamerPage,
  ProfileModalPage,
  ProfileNetworkPage,
  ProfileNFTPage,
  ProfilePlainPage,
  ProfileTeamsPage,
  ProfileWorksPage,
  ProjectColumn2Page,
  ProjectColumn3Page,
} from '@/pages/public-profile';
import { AllProductsPage, DashboardPage } from '@/pages/store-admin';
import {
  MyOrdersPage,
  OrderPlacedPage,
  OrderReceiptPage,
  OrderSummaryPage,
  PaymentMethodPage,
  ProductDetailsPage,
  SearchResultsGridPage,
  SearchResultsListPage,
  ShippingInfoPage,
  StoreClientPage,
  WishlistPage,
} from '@/pages/store-client';
import { Tasks } from '@/pages/Tasks/Tasks';
import { Navigate, Route, Routes } from 'react-router';
import Dashboard from '../pages/dashboards/Dashboard';
import CateringPipeline from '../pages/Pipelinescreen/Cateringpipeline';
import PipelineCustomization from '../pages/Pipelinescreen/PipelineCustomization';
import PipelineOverview from '../pages/Pipelinescreen/PipelineOverview';
import TaskViewDashboard from '../pages/Projectscreen/TaskViewDashboard/TaskViewDashboard';
import { UserManagement } from '../pages/UserManagement/UserManagement';
import { AddUser } from '../pages/UserManagement/AddUser';
import CreatePipeline from '../pages/Pipelinescreen/CreatePipeline';
import { IssuesDashboard } from '../pages/Issues/IssuesDashboard';
import Setting from '../pages/settings/Settings';
import OutletListing from '../pages/outlets/OutletListing';
import CompaniesListing from '../pages/company-registration/CompanyListing';
import CompanyRegistration from '../pages/company-registration/CompanyRegistration';
import AddOutlet from '../pages/outlets/AddOutlet';
import PurchaseListing from '../pages/stock-purchase/PurchaseListing';
import AddPurchase from '../pages/stock-purchase/AddPurchase';
import PurchaseOrderListing from '../pages/purchase-order/PurchaseOrderListing';
import AddPurchaseOrder from '../pages/purchase-order/AddPurchaseOrder';
import PurchaseReturnList from '../pages/purchase-return-list/PurchaseReturnListing';
import AddPurchaseReturn from '../pages/purchase-return-list/AddPurchaseReturn';
import AvailableStocks from '../pages/manage-stocks/AvailableStocks';
import AddStock from '../pages/manage-stocks/AddStock';
import ClosingStock from '../pages/manage-stocks/ClosingStock';
import VendorListing from '../pages/vendors/VendorListing';
import AddVendor from '../pages/vendors/AddVendor';
import UserManagementList from '../pages/user/UserManagementList';
import UserRegistration from '../pages/user/UserRegistration';
import UserVendorSelectionPage from '../pages/userVendorSelection/UserVendorSelectionPage';
import KycInformation from '../pages/kyc-info/user-kycInformation/KycInformation';
import VendorKycInfo from '../pages/kyc-info/vendor-kycInformation/VendorKycInfo';
import LoginPage from '../pages/auth/login/Login';
import AssetsManagement from '../pages/assest-management/assest-registry/AssetsManagement';
import AddAsset from '../pages/assest-management/assest-registry/AddAsset';
import AssignAssets from '../pages/assest-management/assign-assets/AssignAsset';
import AddAssignAsset from '../pages/assest-management/assign-assets/AddAssignAsset';
import AssetSubCategory from '../pages/assest-management/sub-categories/AssetSubCategory';
import AssetCategory from '../pages/assest-management/categories/AssetCategory';
import AssetsType from '../pages/assest-management/assets-type/AssetsType';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" />} />

      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dark-sidebar" element={<Demo1DarkSidebarPage />} />

          <Route path="/companies" element={<CompaniesListing />} /> 
          <Route path="/companies/registration" element={<CompanyRegistration />} />

          <Route path="/outlets" element={<OutletListing />} />
          <Route path="/outlets/registration" element={<AddOutlet />} />

          <Route path="/vendors" element={<VendorListing />} />
          <Route path="/vendors/add-vendor" element={<AddVendor />} />
          <Route path='/user-vendor-selection' element={<UserVendorSelectionPage/>} />

          <Route path='/users' element={<UserManagementList/>} />
          <Route path='/users/add-user' element={<UserRegistration />} />

          <Route path="/assets" element={<AssetsManagement />} />
          <Route path="/assets/add-asset" element={<AddAsset />} />

          <Route path="/assigned-assets" element={<AssignAssets />} />
          <Route path="/assets/assign-asset" element={<AddAssignAsset /> } />

          <Route path='/assets/categories' element={<AssetCategory /> } />
          <Route path='/assets/sub-categories' element={<AssetSubCategory /> } /> 
          <Route path="/assigned-assests" element={<AssignAssets />} />
          <Route path='/assets-type' element={<AssetsType/>}/>

          <Route path="/purchase/stock-purchase" element={<PurchaseListing />} />
          <Route path="/purchase/add-purchase" element={<AddPurchase />} />

          <Route path="/purchase/purchase-order" element={<PurchaseOrderListing />} />
          <Route path="/purchase/add-purchase-order" element={<AddPurchaseOrder />} />

          <Route path="/purchase/purchase-return" element={<PurchaseReturnList />} />
          <Route path="/purchase/add-purchase-return" element={<AddPurchaseReturn />} />

          <Route path="/stocks/available-stocks" element={<AvailableStocks />} />
          <Route path="/stocks/closing-stock" element={<ClosingStock />} />
          <Route path="/stocks/add-stock" element={<AddStock />} />


          <Route
            path="/projectdashboard/taskview"
            element={<TaskViewDashboard />}
          />
          <Route path="/viewpipeline" element={<CateringPipeline />} />
          <Route
            path="/viewpipeline/customizedpipe"
            element={<PipelineCustomization />}
          />
          <Route path="/pipelineoverview" element={<PipelineOverview />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/user-management/adduser" element={<AddUser />} />


   
          <Route path="/issues-dashbiard" element={<IssuesDashboard/>}/>

          <Route path="/createpipeline" element={<CreatePipeline />} />

          <Route path='/user/kyc-information' element={<KycInformation/>} />
          <Route path='/vendor/kyc-information' element={<VendorKycInfo/>}/>
          
          <Route path="/settings" element={<Setting />} />



          <Route
            path="/public-profile/profiles/default/"
            element={<ProfileDefaultPage />}
          />

          <Route
            path="/public-profile/profiles/creator"
            element={<ProfileCreatorPage />}
          />

          <Route
            path="/public-profile/profiles/company"
            element={<ProfileCompanyPage />}
          />

          <Route
            path="/public-profile/profiles/nft"
            element={<ProfileNFTPage />}
          />

          <Route
            path="/public-profile/profiles/blogger"
            element={<ProfileBloggerPage />}
          />

          <Route
            path="/public-profile/profiles/crm"
            element={<ProfileCRMPage />}
          />

          <Route
            path="/public-profile/profiles/gamer"
            element={<ProfileGamerPage />}
          />

          <Route
            path="/public-profile/profiles/feeds"
            element={<ProfileFeedsPage />}
          />

          <Route
            path="/public-profile/profiles/plain"
            element={<ProfilePlainPage />}
          />

          <Route
            path="/public-profile/profiles/modal"
            element={<ProfileModalPage />}
          />

          <Route
            path="/public-profile/projects/3-columns"
            element={<ProjectColumn3Page />}
          />

          <Route
            path="/public-profile/projects/2-columns"
            element={<ProjectColumn2Page />}
          />

          <Route path="/public-profile/works" element={<ProfileWorksPage />} />
          <Route path="/public-profile/teams" element={<ProfileTeamsPage />} />
          <Route
            path="/public-profile/network"
            element={<ProfileNetworkPage />}
          />

          <Route
            path="/public-profile/activity"
            element={<ProfileActivityPage />}
          />

          <Route
            path="/public-profile/campaigns/card"
            element={<CampaignsCardPage />}
          />

          <Route
            path="/public-profile/campaigns/list"
            element={<CampaignsListPage />}
          />

          <Route path="/public-profile/empty" element={<ProfileEmptyPage />} />
          <Route
            path="/account/home/get-started"
            element={<AccountGetStartedPage />}
          />

          <Route
            path="/account/home/user-profile"
            element={<AccountUserProfilePage />}
          />

          <Route
            path="/account/home/company-profile"
            element={<AccountCompanyProfilePage />}
          />

          <Route
            path="/account/home/settings-sidebar"
            element={<AccountSettingsSidebarPage />}
          />

          <Route
            path="/account/home/settings-enterprise"
            element={<AccountSettingsEnterprisePage />}
          />

          <Route
            path="/account/home/settings-plain"
            element={<AccountSettingsPlainPage />}
          />

          <Route
            path="/account/home/settings-modal"
            element={<AccountSettingsModalPage />}
          />

          <Route path="/account/billing/basic" element={<AccountBasicPage />} />
          <Route
            path="/account/billing/enterprise"
            element={<AccountEnterprisePage />}
          />

          <Route path="/account/billing/plans" element={<AccountPlansPage />} />
          <Route
            path="/account/billing/history"
            element={<AccountHistoryPage />}
          />

          <Route
            path="/account/security/get-started"
            element={<AccountSecurityGetStartedPage />}
          />

          <Route
            path="/account/security/overview"
            element={<AccountOverviewPage />}
          />

          <Route
            path="/account/security/allowed-ip-addresses"
            element={<AccountAllowedIPAddressesPage />}
          />

          <Route
            path="/account/security/privacy-settings"
            element={<AccountPrivacySettingsPage />}
          />

          <Route
            path="/account/security/device-management"
            element={<AccountDeviceManagementPage />}
          />

          <Route
            path="/account/security/backup-and-recovery"
            element={<AccountBackupAndRecoveryPage />}
          />

          <Route
            path="/account/security/current-sessions"
            element={<AccountCurrentSessionsPage />}
          />

          <Route
            path="/account/security/security-log"
            element={<AccountSecurityLogPage />}
          />

          <Route
            path="/account/members/team-starter"
            element={<AccountTeamsStarterPage />}
          />

          <Route path="/account/members/teams" element={<AccountTeamsPage />} />
          <Route
            path="/account/members/team-info"
            element={<AccountTeamInfoPage />}
          />

          <Route
            path="/account/members/members-starter"
            element={<AccountMembersStarterPage />}
          />

          <Route
            path="/account/members/team-members"
            element={<AccountTeamMembersPage />}
          />

          <Route
            path="/account/members/import-members"
            element={<AccountImportMembersPage />}
          />

          <Route path="/account/members/roles" element={<AccountRolesPage />} />
          <Route
            path="/account/members/permissions-toggle"
            element={<AccountPermissionsTogglePage />}
          />

          <Route
            path="/account/members/permissions-check"
            element={<AccountPermissionsCheckPage />}
          />

          <Route
            path="/account/integrations"
            element={<AccountIntegrationsPage />}
          />

          <Route
            path="/account/notifications"
            element={<AccountNotificationsPage />}
          />

          <Route path="/account/api-keys" element={<AccountApiKeysPage />} />
          <Route
            path="/account/appearance"
            element={<AccountAppearancePage />}
          />

          <Route
            path="/account/invite-a-friend"
            element={<AccountInviteAFriendPage />}
          />

          <Route path="/account/activity" element={<AccountActivityPage />} />
          <Route
            path="/network/get-started"
            element={<NetworkGetStartedPage />}
          />

          <Route
            path="/network/user-cards/mini-cards"
            element={<NetworkMiniCardsPage />}
          />

          <Route
            path="/network/user-cards/team-crew"
            element={<NetworkUserCardsTeamCrewPage />}
          />

          <Route
            path="/network/user-cards/author"
            element={<NetworkAuthorPage />}
          />

          <Route path="/network/user-cards/nft" element={<NetworkNFTPage />} />
          <Route
            path="/network/user-cards/social"
            element={<NetworkSocialPage />}
          />

          <Route
            path="/network/user-table/team-crew"
            element={<NetworkUserTableTeamCrewPage />}
          />

          <Route
            path="/network/user-table/app-roster"
            element={<NetworkAppRosterPage />}
          />

          <Route
            path="/network/user-table/market-authors"
            element={<NetworkMarketAuthorsPage />}
          />

          <Route
            path="/network/user-table/saas-users"
            element={<NetworkSaasUsersPage />}
          />

          <Route
            path="/network/user-table/store-clients"
            element={<NetworkStoreClientsPage />}
          />

          <Route
            path="/network/user-table/visitors"
            element={<NetworkVisitorsPage />}
          />

          <Route
            path="/auth/welcome-message"
            element={<AuthWelcomeMessagePage />}
          />

          <Route
            path="/auth/account-deactivated"
            element={<AuthAccountDeactivatedPage />}
          />

          <Route path="/store-client/home" element={<StoreClientPage />} />
          <Route
            path="/store-client/search-results-grid"
            element={<SearchResultsGridPage />}
          />

          <Route
            path="/store-client/search-results-list"
            element={<SearchResultsListPage />}
          />

          <Route
            path="/store-client/product-details"
            element={<ProductDetailsPage />}
          />

          <Route path="/store-client/wishlist" element={<WishlistPage />} />
          <Route
            path="/store-client/checkout/order-summary"
            element={<OrderSummaryPage />}
          />

          <Route
            path="/store-client/checkout/shipping-info"
            element={<ShippingInfoPage />}
          />

          <Route
            path="/store-client/checkout/payment-method"
            element={<PaymentMethodPage />}
          />

          <Route
            path="/store-client/checkout/order-placed"
            element={<OrderPlacedPage />}
          />

          <Route path="/store-client/my-orders" element={<MyOrdersPage />} />
          <Route
            path="/store-client/order-receipt"
            element={<OrderReceiptPage />}
          />

          <Route path="/store-admin/dashboard" element={<DashboardPage />} />
          <Route
            path="/store-admin/inventory/all-products"
            element={<AllProductsPage />}
          />

          <Route path="/auth/get-started" element={<AccountGetStartedPage />} />

        </Route>
      </Route>
    </Routes>
  );
}
