'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Dashboard from '../../components/Dashboard';
import InventoryView from '../../components/InventoryView';
import BranchesView from '../../components/BranchesView';
import SalesReportsView from '../../components/SalesReportsView';
import SettingsView from '../../components/SettingsView';
import AlertsView from '../../components/AlertsView';
import CustomersView from '../../components/CustomersView';
import PromotionsView from '../../components/PromotionsView';
import ClosingReportsView from '../../components/ClosingReportsView';
import SuppliersView from '../../components/SuppliersView';
import AuditLogsView from '../../components/AuditLogsView';
import ExpensesView from '../../components/ExpensesView';
import PurchaseOrdersView from '../../components/PurchaseOrdersView';
import StocktakeView from '../../components/StocktakeView';

const DashboardContent = () => {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'dashboard';

    const renderContent = () => {
        switch (tab) {
            case 'dashboard':
                return <Dashboard />;
            case 'branches':
                return <BranchesView />;
            case 'sales':
                return <SalesReportsView />;
            case 'inventory':
                return <InventoryView />;
            case 'alerts':
                return <AlertsView />;
            case 'customers':
                return <CustomersView />;
            case 'promotions':
                return <PromotionsView />;
            case 'closing':
                return <ClosingReportsView />;
            case 'suppliers':
                return <SuppliersView />;
            case 'settings':
                return <SettingsView />;
            case 'audit':
                return <AuditLogsView />;
            case 'expenses':
                return <ExpensesView />;
            case 'procurement':
                return <PurchaseOrdersView />;
            case 'reconciliation':
                return <StocktakeView />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div style={{ minHeight: '100vh', width: '100%' }}>
            {renderContent()}
        </div>
    );
};

export default function Home() {
    return (
        <Suspense fallback={null}>
            <DashboardContent />
        </Suspense>
    );
}
