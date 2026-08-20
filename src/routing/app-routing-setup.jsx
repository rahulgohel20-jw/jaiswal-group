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
import AddAssetsMaintenanceLog from '../pages/assest-management/assest-maintenance/AddAssetsMaintenanceLog';
import AssetsMaintenance from '../pages/assest-management/assest-maintenance/AssetsMaintenance';
import ExportAssetsQR from '../pages/assest-management/assest-qr/ExportAssetsQR';
import AddAsset from '../pages/assest-management/assest-registry/AddAsset';
import AssetsManagement from '../pages/assest-management/assest-registry/AssetsManagement';
import AssetBrandListing from '../pages/assest-management/asset-brand/AssetBrandListing';
import AddAssetsDisposal from '../pages/assest-management/assets-disposal-log/AddAssetsDisposal';
import AssetsDisposalLog from '../pages/assest-management/assets-disposal-log/AssetsDisposalLog';
import AssetItemsList from '../pages/assest-management/assets-items/AssetsItemList';
import AddAssetsTransfer from '../pages/assest-management/assets-transfer/AddAssetsTranfer';
import AssetsTransferLog from '../pages/assest-management/assets-transfer/AssetsTransferLog';
import AssetsType from '../pages/assest-management/assets-type/AssetsType';
import AssetUnitList from '../pages/assest-management/assets-unit/AssetUnitList';
import AddAssignAsset from '../pages/assest-management/assign-assets/AddAssignAsset';
import AssignAssets from '../pages/assest-management/assign-assets/AssignAsset';
import AssetCategory from '../pages/assest-management/categories/AssetCategory';
import ConditionMasterModule from '../pages/assest-management/conditions/ConditionMasterModule';
import StatusMasterModule from '../pages/assest-management/status/StatusMasterModule';
import AssetSubCategory from '../pages/assest-management/sub-categories/AssetSubCategory';
import ChangePasswordPage from '../pages/auth/login/ChangePasswordPage';
import ForgotPasswordPage from '../pages/auth/login/ForgotPassword';
import { GuestOnly } from '../pages/auth/login/GuestOnly';
import LoginPage from '../pages/auth/login/Login';
import ResetPasswordPage from '../pages/auth/login/ResetPassword';
import CompaniesListing from '../pages/company-registration/CompanyListing';
import CompanyRegistration from '../pages/company-registration/CompanyRegistration';
import CompanyViewDetails from '../pages/company-registration/CompanyViewDetails';
import Dashboard from '../pages/dashboards/Dashboard';
import Departmentlist from '../pages/department/Departmentlist';
import UserRights from '../pages/department/UserRights';
import { IssuesDashboard } from '../pages/Issues/IssuesDashboard';
import KycInformation from '../pages/kyc-info/user-kycInformation/KycInformation';
import VendorKycInfo from '../pages/kyc-info/vendor-kycInformation/VendorKycInfo';
import CityMaster from '../pages/location/city-master/CityMaster';
import StateMaster from '../pages/location/state-master/StateMaster';
import AddStock from '../pages/manage-stocks/AddStock';
import AvailableStocks from '../pages/manage-stocks/AvailableStocks';
import ClosingStock from '../pages/manage-stocks/ClosingStock';
import CreateMenuItem from '../pages/menu-item/create-menu-item/CreateMenuItem';
import MenuItemsListing from '../pages/menu-item/create-menu-item/MenuItemListing';
import CreateCategory from '../pages/menu-item/menu-category/CreateMenuCategory';
import MenuCategory from '../pages/menu-item/menu-category/MenuCategory';
import MenuSubCategory from '../pages/menu-item/menu-subcategory/MenuSubCategory';
import TaskViewDashboard from '../pages/Projectscreen/TaskViewDashboard/TaskViewDashboard';
import PurchaseOrderApproved from '../pages/purchase-approved-order/PurchaseOrderApproved';
import CreatePurchaseOrder from '../pages/purchase-order-requests/CreatePurchaseOrder';
import PurchaseOrderRequest from '../pages/purchase-order-requests/PurchaseOrderRequest';
import AddPurchaseOrder from '../pages/purchase-order/AddPurchaseOrder';
import AddPurchaseRequisition from '../pages/purchase-requisition/AddPurchaseRequisition';
import PurchaseRequisitionApproval from '../pages/purchase-requisition/PurchaseRequisitionApproval';
import PurchaseRequisitionList from '../pages/purchase-requisition/PurchaseRequisitionList';
import AddPurchaseReturn from '../pages/purchase-return-list/AddPurchaseReturn';
import PurchaseReturnList from '../pages/purchase-return-list/PurchaseReturnListing';
import RowCategoryBrandMapping from '../pages/raw-material/category-brand-mapping/RowCategoryBrandMapping';
import RowMaterialBrandMaster from '../pages/raw-material/raw-material-brand-master/RowMaterialBrandMaster';
import RowMaterialItemMaster from '../pages/raw-material/raw-material-item-master/RowMaterialItemMaster';
import RawMaterialTypeListing from '../pages/raw-material/raw-material-type/RawMaterialTypeListing';
import RowMaterialUnit from '../pages/raw-material/raw-material-unit-master/RowMaterialUnit';
import RowMaterialCategories from '../pages/raw-material/row-material-categories/RowMaterialCategories';
import Setting from '../pages/settings/Settings';
import AddPurchase from '../pages/stock-purchase/AddPurchase';
import PurchaseListing from '../pages/stock-purchase/PurchaseListing';
import AddSubUnit from '../pages/sub-unit/AddSubunit';
import SubUnitDetails from '../pages/sub-unit/Subunitdetails';
import SubUnitList from '../pages/sub-unit/SubUnitListing';
import SubUnitListing from '../pages/sub-unit/SubUnitListing';
import AddUnit from '../pages/units/AddUnit';
import UnitListing from '../pages/units/UnitListing';
import UnitViewDetails from '../pages/units/UnitViewDetails';
import ModuleMaster from '../pages/user-rights/module/ModuleMaster';
import PageMaster from '../pages/user-rights/pages/PageMaster';
import UserManagementList from '../pages/user/UserManagementList';
import UserRegistration from '../pages/user/UserRegistration';
import UserViewDetails from '../pages/user/UserViewDetails';
import { AddUser } from '../pages/UserManagement/AddUser';
import { UserManagement } from '../pages/UserManagement/UserManagement';
import UserVendorSelectionPage from '../pages/userVendorSelection/UserVendorSelectionPage';
import VendorUnitMapping from '../pages/vendor-unit-mapping/VendorUnitMapping';
import AddVendor from '../pages/vendors/AddVendor';
import VendorListing from '../pages/vendors/VendorListing';
import VendorViewDetails from '../pages/vendors/VendorViewDetails';
import RawMaterialSubCategory from '../pages/raw-material/raw-material-subcategory/RawMaterialSubCategory';
import PurchaseRequisitionApprovalDetail from '../pages/purchase-requisition/PurchaseRequisitionApprovalDetail';
import PurchaseRequisitionView from '../pages/purchase-requisition/PurchaseRequisitionView';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/" element={<LoginPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="error/*" element={<ErrorRouting />} />
      {/* <Route path="auth/*" element={<AuthRouting />} />  — remove or keep only for /auth/callback etc, no longer needed for signin */}
      <Route path="*" element={<Navigate to="/error/404" />} />

      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dark-sidebar" element={<Demo1DarkSidebarPage />} />

          <Route path="/companies" element={<CompaniesListing />} />
          <Route
            path="/companies/registration"
            element={<CompanyRegistration />}
          />
          <Route
            path="/companies/update-company"
            element={<CompanyRegistration />}
          />
          <Route
            path="/companies/company-details"
            element={<CompanyViewDetails />}
          />

          <Route path="/units" element={<UnitListing />} />
          <Route path="/units/add-unit" element={<AddUnit />} />
          <Route path="/units/update-unit" element={<AddUnit />} />
          <Route path="/units/view-unit" element={<UnitViewDetails />} />

          <Route path="/sub-units" element={<SubUnitListing />} />
          <Route path="/sub-units/add" element={<AddSubUnit />} />
          <Route path="/sub-units/update-sub-unit" element={<AddSubUnit />} />
          <Route
            path="/sub-units/sub-unit-details"
            element={<SubUnitDetails />}
          />

          <Route path="/assets/assets-items" element={<AssetItemsList />} />

          <Route path="/assets/asset-unit" element={<AssetUnitList />} />

          <Route path="/vendors" element={<VendorListing />} />
          <Route path="/vendors/add-vendor" element={<AddVendor />} />
          <Route path="/vendors/view-vendor" element={<VendorViewDetails />} />

          <Route path="/vendors/update-vendor" element={<AddVendor />} />
          <Route
            path="/user-vendor-selection"
            element={<UserVendorSelectionPage />}
          />

          <Route path="/users" element={<UserManagementList />} />
          <Route path="/users/add-user" element={<UserRegistration />} />
          <Route path="/users/update-user" element={<UserRegistration />} />
          <Route path="/users/view-user" element={<UserViewDetails />} />

          <Route path="/vendor-unit-mapping" element={<VendorUnitMapping />} />

          <Route path="/department" element={<Departmentlist />} />
          <Route path="/user-rights" element={<UserRights />} />

          <Route path="/assets/all-assets" element={<AssetsManagement />} />
          <Route path="/assets/add-asset" element={<AddAsset />} />
          <Route path="/assets/edit-asset/:id" element={<AddAsset />} />

          <Route path="/assigned-assets" element={<AssignAssets />} />
          <Route path="/assets/assign-asset" element={<AddAssignAsset />} />
          
          <Route
            path="/assets/assign-asset/edit/:id"
            element={<AddAssignAsset />}
          />

          <Route path="/assets/categories" element={<AssetCategory />} />
          <Route path="/assets/sub-categories" element={<AssetSubCategory />} />

          <Route path="/assigned-assests" element={<AssignAssets />} />
          <Route path="/assets/asset-type" element={<AssetsType />} />

          <Route path="/assets/asset-brand" element={<AssetBrandListing />} />

          <Route
            path="/assets/conditions"
            element={<ConditionMasterModule />}
          />
          <Route path="/assets/status" element={<StatusMasterModule />} />

          <Route
            path="/assets/asset-maintenance"
            element={<AssetsMaintenance />}
          />
          <Route
            path="/assets/add-maintenance-log"
            element={<AddAssetsMaintenanceLog />}
          />

          <Route path="/material/types" element={<RawMaterialTypeListing />} />
          <Route
            path="/material/categories"
            element={<RowMaterialCategories />}
          />
          <Route path='/material/sub-categories' element={<RawMaterialSubCategory/>} />
          <Route path="/material/items" element={<RowMaterialItemMaster />} />
          <Route path="/material/unit-master" element={<RowMaterialUnit />} />
          <Route
            path="/material/brand-master"
            element={<RowMaterialBrandMaster />}
          />
          <Route
            path="/material/category-brand-mapping"
            element={<RowCategoryBrandMapping />}
          />

          <Route
            path="/assets/asset-transfer-log"
            element={<AssetsTransferLog />}
          />
          <Route
            path="/assets/asset-transfer"
            element={<AddAssetsTransfer />}
          />

          <Route
            path="/assets/asset-disposal"
            element={<AssetsDisposalLog />}
          />
          <Route path="/assets/add-disposal" element={<AddAssetsDisposal />} />

          <Route path="/assets/export-assets-qr" element={<ExportAssetsQR />} />

          <Route path="/location/state" element={<StateMaster />} />
          <Route path="/location/city" element={<CityMaster />} />

          <Route path="/pages" element={<PageMaster />} />
          <Route path="/module-rights" element={<ModuleMaster />} />

          <Route path="/material/types" element={<RawMaterialTypeListing />} />
          <Route
            path="/material/categories"
            element={<RowMaterialCategories />}
          />
          <Route path="/material/items" element={<RowMaterialItemMaster />} />
          <Route path="/material/unit-master" element={<RowMaterialUnit />} />

          <Route path="/menu-item/categories" element={<MenuCategory />} />
          <Route path="/menu-item/sub-category" element={<MenuSubCategory />} />

          <Route path="/menu-item/menu-items" element={<MenuItemsListing />} />
          <Route
            path="/menu-item/add-menu-items"
            element={<CreateMenuItem />}
          />
          <Route
            path="/menu-item/edit-menu-item/:id"
            element={<CreateMenuItem />}
          />

          <Route
            path="/purchase-requisition/list"
            element={<PurchaseRequisitionList />}
          />
          <Route
            path="/purchase-requisition/add"
            element={<AddPurchaseRequisition />}
          />
          <Route path="/purchase-requisition/edit/:id" element={<AddPurchaseRequisition />} />
          <Route
              path="/approve-purchase-requisition/approve/:id"
              element={<PurchaseRequisitionApprovalDetail mode="approve" />}
            />
            <Route
              path="/approve-purchase-requisition/reject/:id"
              element={<PurchaseRequisitionApprovalDetail mode="reject" />}
            />

            <Route path="/purchase-requisition/view/:id" element={<PurchaseRequisitionView />} />
          <Route
            path="/approve-purchase-requisition/list"
            element={<PurchaseRequisitionApproval />}
          />
          <Route
            path="/purchase/stock-purchase"
            element={<PurchaseListing />}
          />
          <Route path="/purchase/add-purchase" element={<AddPurchase />} />
          <Route
            path="/purchase/purchase-order"
            element={<AddPurchaseOrder />}
          />
          <Route
            path="/purchase-order-request/purchase"
            element={<PurchaseOrderRequest />}
          />
          <Route
            path="/purchase/create-purchase-order-requests"
            element={<CreatePurchaseOrder />}
          />
          <Route
            path="/purchase/approved-order"
            element={<PurchaseOrderApproved />}
          />

          <Route
            path="/purchase/purchase-return"
            element={<PurchaseReturnList />}
          />
          <Route
            path="/purchase/add-purchase-return"
            element={<AddPurchaseReturn />}
          />

          <Route
            path="/stocks/available-stocks"
            element={<AvailableStocks />}
          />
          <Route path="/stocks/closing-stock" element={<ClosingStock />} />
          <Route path="/stocks/add-stock" element={<AddStock />} />
          <Route
            path="/projectdashboard/taskview"
            element={<TaskViewDashboard />}
          />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/user-management/adduser" element={<AddUser />} />

          <Route path="/issues-dashbiard" element={<IssuesDashboard />} />

          <Route path="/user/kyc-information" element={<KycInformation />} />
          <Route path="/vendor/kyc-information" element={<VendorKycInfo />} />

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
