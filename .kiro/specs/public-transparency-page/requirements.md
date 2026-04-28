# Requirements Document

## Introduction

This document defines the requirements for a public transparency page on the Bimex crowdfunding platform. The transparency page allows anyone to view platform statistics and project data without connecting a wallet, reinforcing Bimex's commitment to transparency as a core pillar of the platform.

Bimex is a social impact crowdfunding platform built on Stellar blockchain where contributors' capital is always recoverable. The platform generates yield through CETES (via Etherfuse) and Stellar AMM fees, which funds projects while protecting contributors' principal.

## Glossary

- **Bimex_Platform**: The social impact crowdfunding platform built on Stellar blockchain
- **Transparency_Page**: A public-facing page accessible at /transparencia that displays platform statistics and project data
- **Smart_Contract**: The Soroban smart contract deployed on Stellar that manages all platform operations
- **MXNe**: Mexican Peso stablecoin token used for all transactions on the platform
- **Wallet_Connection**: The process of connecting a Freighter wallet to interact with the platform
- **Project_Status**: The current state of a project (EtapaInicial, EnProgreso, Liberado, Abandonado, EnRevision, Rechazado)
- **Public_Project**: A project with status EtapaInicial, EnProgreso, Liberado, or Abandonado
- **Stroops**: The smallest unit of MXNe token (1 MXNe = 10,000,000 stroops)
- **Yield**: The return generated from CETES and AMM fees that funds the project
- **Principal**: The original capital contributed by backers, which is always recoverable
- **Funding_Progress**: The percentage of goal achieved (aportado / meta * 100)

## Requirements

### Requirement 1: Public Access Without Wallet

**User Story:** As a visitor, I want to view platform transparency data without connecting a wallet, so that I can verify the platform's legitimacy before deciding to participate.

#### Acceptance Criteria

1. THE Transparency_Page SHALL be accessible at the /transparencia route
2. WHEN a user navigates to /transparencia, THE Bimex_Platform SHALL display the page without requiring Wallet_Connection
3. THE Transparency_Page SHALL load and display data using read-only Smart_Contract functions
4. THE Transparency_Page SHALL use a dummy account for contract simulation calls
5. IF Smart_Contract calls fail, THEN THE Transparency_Page SHALL display fallback values or error messages

### Requirement 2: Platform-Wide Statistics Display

**User Story:** As a visitor, I want to see aggregated platform statistics, so that I can understand the scale and activity of the platform.

#### Acceptance Criteria

1. THE Transparency_Page SHALL display the total number of projects on the platform
2. THE Transparency_Page SHALL display the total funds locked across all projects in MXNe
3. THE Transparency_Page SHALL display the count of projects by status (EtapaInicial, EnProgreso, Liberado, Abandonado)
4. THE Transparency_Page SHALL display the total yield generated across all projects in MXNe
5. WHEN calculating total funds locked, THE Transparency_Page SHALL sum the aportado field from all projects
6. WHEN calculating total yield, THE Transparency_Page SHALL call calcularYieldDetallado for each project and sum the results
7. THE Transparency_Page SHALL format all MXNe amounts using the stroopsAMXNe helper function
8. WHILE statistics are loading, THE Transparency_Page SHALL display loading indicators

### Requirement 3: Project List Display

**User Story:** As a visitor, I want to see a list of all public projects with their details, so that I can evaluate individual projects and their progress.

#### Acceptance Criteria

1. THE Transparency_Page SHALL display a list of all Public_Projects
2. FOR EACH Public_Project, THE Transparency_Page SHALL display the project name
3. FOR EACH Public_Project, THE Transparency_Page SHALL display the funding amount (aportado) in MXNe
4. FOR EACH Public_Project, THE Transparency_Page SHALL display the funding goal (meta) in MXNe
5. FOR EACH Public_Project, THE Transparency_Page SHALL display the Funding_Progress as a percentage
6. FOR EACH Public_Project, THE Transparency_Page SHALL display the current Project_Status
7. FOR EACH Public_Project, THE Transparency_Page SHALL display a visual progress bar showing Funding_Progress
8. THE Transparency_Page SHALL NOT display projects with status EnRevision or Rechazado
9. WHEN no Public_Projects exist, THE Transparency_Page SHALL display an empty state message
10. WHILE projects are loading, THE Transparency_Page SHALL display a loading indicator

### Requirement 4: Project Status Filtering

**User Story:** As a visitor, I want to filter projects by status, so that I can focus on projects in specific stages.

#### Acceptance Criteria

1. THE Transparency_Page SHALL provide filter buttons for "Todos", "EtapaInicial", "EnProgreso", "Liberado", and "Abandonado"
2. WHEN a user clicks a filter button, THE Transparency_Page SHALL display only projects matching that Project_Status
3. WHEN the "Todos" filter is active, THE Transparency_Page SHALL display all Public_Projects
4. THE Transparency_Page SHALL visually indicate which filter is currently active
5. WHEN a filter results in zero projects, THE Transparency_Page SHALL display a "no results" message
6. THE Transparency_Page SHALL maintain filter state during the user's session
7. THE Transparency_Page SHALL use translated filter labels from the i18n system

### Requirement 5: Navigation Integration

**User Story:** As a user, I want to access the transparency page from the main navigation, so that I can easily find transparency information.

#### Acceptance Criteria

1. THE Bimex_Platform SHALL add a "Transparencia" link to the navigation header
2. WHEN a user is not connected with a wallet, THE navigation SHALL display the "Transparencia" link
3. WHEN a user is connected with a wallet, THE navigation SHALL display the "Transparencia" link
4. WHEN a user clicks the "Transparencia" link, THE Bimex_Platform SHALL navigate to /transparencia
5. THE navigation link SHALL use translated labels from the i18n system (es: "Transparencia", en: "Transparency")

### Requirement 6: Real-Time Data from Smart Contract

**User Story:** As a visitor, I want to see real data from the blockchain, so that I can trust the information is accurate and not manipulated.

#### Acceptance Criteria

1. THE Transparency_Page SHALL call obtenerTodosLosProyectos to retrieve all projects
2. THE Transparency_Page SHALL call calcularYieldDetallado for each project to get yield data
3. THE Transparency_Page SHALL use the existing contrato.js functions without modification
4. THE Transparency_Page SHALL NOT use mock or hardcoded data
5. WHEN Smart_Contract functions return data, THE Transparency_Page SHALL display the data within 5 seconds
6. IF a Smart_Contract call fails, THEN THE Transparency_Page SHALL retry up to 3 times
7. IF all retries fail, THEN THE Transparency_Page SHALL display an error message to the user

### Requirement 7: Responsive Design and Accessibility

**User Story:** As a visitor on any device, I want the transparency page to be readable and usable, so that I can access information regardless of my device or abilities.

#### Acceptance Criteria

1. THE Transparency_Page SHALL be responsive and usable on mobile, tablet, and desktop screen sizes
2. THE Transparency_Page SHALL use semantic HTML elements for proper structure
3. THE Transparency_Page SHALL provide appropriate ARIA labels for interactive elements
4. THE Transparency_Page SHALL maintain sufficient color contrast ratios for text readability
5. THE Transparency_Page SHALL be keyboard navigable
6. THE Transparency_Page SHALL follow the existing Bimex design system and styling patterns
7. THE Transparency_Page SHALL use the existing CSS classes and style conventions from the codebase

### Requirement 8: Internationalization Support

**User Story:** As a visitor, I want to view the transparency page in my preferred language, so that I can understand the information clearly.

#### Acceptance Criteria

1. THE Transparency_Page SHALL support Spanish (es) and English (en) languages
2. THE Transparency_Page SHALL use the useTranslation hook from react-i18next
3. THE Transparency_Page SHALL add translation keys to es.json and en.json files
4. WHEN a user changes language, THE Transparency_Page SHALL update all text content immediately
5. THE Transparency_Page SHALL format numbers according to the selected locale (es-MX for Spanish)
6. THE Transparency_Page SHALL use the existing i18n system without creating new translation files

### Requirement 9: Performance and Loading States

**User Story:** As a visitor, I want the page to load quickly and show progress, so that I know the system is working and don't abandon the page.

#### Acceptance Criteria

1. THE Transparency_Page SHALL display loading indicators while fetching data from Smart_Contract
2. THE Transparency_Page SHALL load statistics and project list in parallel when possible
3. THE Transparency_Page SHALL cache project data for 30 seconds to reduce redundant contract calls
4. WHEN data is cached, THE Transparency_Page SHALL display cached data immediately
5. THE Transparency_Page SHALL provide a manual refresh button to reload data
6. WHEN a user clicks refresh, THE Transparency_Page SHALL clear cache and fetch fresh data
7. THE Transparency_Page SHALL display the last update timestamp
8. IF data loading takes longer than 10 seconds, THEN THE Transparency_Page SHALL display a timeout message

### Requirement 10: Error Handling and User Feedback

**User Story:** As a visitor, I want clear feedback when errors occur, so that I understand what went wrong and what I can do about it.

#### Acceptance Criteria

1. IF Smart_Contract calls fail, THEN THE Transparency_Page SHALL display user-friendly error messages
2. THE Transparency_Page SHALL distinguish between network errors, contract errors, and data errors
3. WHEN an error occurs, THE Transparency_Page SHALL provide actionable guidance (e.g., "Try refreshing the page")
4. THE Transparency_Page SHALL log detailed error information to the browser console for debugging
5. IF a project's data is corrupted or invalid, THEN THE Transparency_Page SHALL skip that project and continue displaying others
6. THE Transparency_Page SHALL NOT crash or show blank screens when errors occur
7. WHEN displaying error messages, THE Transparency_Page SHALL use translated text from the i18n system
