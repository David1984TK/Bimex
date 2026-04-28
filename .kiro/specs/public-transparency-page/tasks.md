# Implementation Plan: Public Transparency Page

## Overview

This plan implements a public-facing transparency page at `/transparencia` that displays real-time platform statistics and project data from the Bimex smart contract. The page is accessible without wallet connection and uses read-only contract calls to ensure data authenticity.

The implementation builds on the existing React/Stellar codebase, reusing components, styling, and the i18n system. The Transparencia.jsx component already exists but needs completion.

## Tasks

- [ ] 1. Add routing and navigation for transparency page
  - Add `/transparencia` route in App.jsx that renders Transparencia component
  - Add "Transparencia" navigation link to navbar (visible to all users, both connected and disconnected)
  - Ensure navigation link uses i18n translation keys
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2. Complete core Transparencia component with data fetching
  - [ ] 2.1 Implement data loading logic in Transparencia.jsx
    - Complete the cargarDatos() function to fetch all projects using obtenerTodosLosProyectos()
    - Fetch yield data for each project using calcularYieldDetallado()
    - Implement parallel data fetching with Promise.all for performance
    - Filter projects to show only public statuses (EtapaInicial, EnProgreso, Liberado, Abandonado)
    - _Requirements: 1.3, 1.4, 3.1, 3.8, 6.1, 6.2, 6.3_

  - [ ]* 2.2 Write property test for public projects visibility
    - **Property 4: Public projects visibility**
    - **Validates: Requirements 3.1**

  - [ ] 2.3 Implement statistics calculation
    - Create calcularEstadisticas() function to aggregate platform-wide stats
    - Calculate total funds locked by summing aportado from all projects
    - Calculate total yield by summing yield data from calcularYieldDetallado()
    - Count projects by status for status breakdown
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.4 Write property tests for statistics calculations
    - **Property 1: Total funds calculation accuracy**
    - **Validates: Requirements 2.5**
    - **Property 2: Total yield calculation accuracy**
    - **Validates: Requirements 2.6**

- [ ] 3. Implement caching and error handling
  - [ ] 3.1 Add client-side caching with 30-second TTL
    - Implement cache object with data, timestamp, and validation methods
    - Check cache validity before fetching new data
    - Provide manual refresh button to clear cache and reload
    - Display last update timestamp
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 3.2 Implement comprehensive error handling
    - Add retry logic (up to 3 attempts) for failed contract calls
    - Handle network errors, contract errors, and data errors separately
    - Display user-friendly error messages with actionable guidance
    - Log detailed errors to console for debugging
    - Ensure page never crashes or shows blank screen on errors
    - _Requirements: 1.5, 6.6, 6.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 3.3 Write property tests for error resilience
    - **Property 9: Graceful error handling for invalid projects**
    - **Validates: Requirements 10.5**
    - **Property 10: Error resilience**
    - **Validates: Requirements 10.6**

- [ ] 4. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create TransparenciaStats sub-component
  - [ ] 5.1 Build statistics display component
    - Create TransparenciaStats component to display platform-wide statistics
    - Show total projects, total funds locked, total yield, and count by status
    - Format all MXNe amounts using stroopsAMXNe helper
    - Display loading indicators while data is being fetched
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8_

  - [ ]* 5.2 Write property test for monetary formatting
    - **Property 3: Consistent monetary formatting**
    - **Validates: Requirements 2.7**

- [ ] 6. Create TransparenciaFilters sub-component
  - [ ] 6.1 Build filter buttons component
    - Create TransparenciaFilters component with filter buttons
    - Implement filters for "Todos", "EtapaInicial", "EnProgreso", "Liberado", "Abandonado"
    - Visually indicate active filter
    - Use translated filter labels from i18n system
    - Pass filter change events to parent component
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [ ]* 6.2 Write property test for filter correctness
    - **Property 7: Filter correctness**
    - **Validates: Requirements 4.2**

- [ ] 7. Create TransparenciaProjectList sub-component
  - [ ] 7.1 Build project list and cards component
    - Create TransparenciaProjectList component to render project cards
    - Display project name, funding amount, goal, progress percentage, and status
    - Add visual progress bar for each project
    - Show document verification indicator if doc_hash exists
    - Display loading indicator while projects are loading
    - Show empty state message when no projects exist
    - Show "no results" message when filter returns zero projects
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10_

  - [ ]* 7.2 Write property test for project card completeness
    - **Property 5: Project card completeness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

  - [ ]* 7.3 Write property test for non-public projects exclusion
    - **Property 6: Non-public projects exclusion**
    - **Validates: Requirements 3.8**

- [ ] 8. Add internationalization support
  - [ ] 8.1 Add translation keys to i18n files
    - Add "transparencia" section to es.json with Spanish translations
    - Add "transparencia" section to en.json with English translations
    - Include keys for: title, subtitle, stats labels, filter labels, project fields, empty states, loading messages, error messages
    - Ensure number formatting respects locale (es-MX for Spanish)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 8.2 Write unit tests for language switching
    - Test that all text updates when language changes
    - Test that number formatting respects locale

- [ ] 9. Implement responsive design and accessibility
  - [ ] 9.1 Add responsive styling
    - Ensure layout works on mobile, tablet, and desktop screen sizes
    - Use existing CSS classes and style conventions from index.css
    - Implement responsive grid for project cards (1-column mobile, 2-column tablet, 3-column desktop)
    - Stack statistics on mobile, display inline on desktop
    - _Requirements: 7.1, 7.6, 7.7_

  - [ ] 9.2 Add accessibility features
    - Use semantic HTML elements (main, section, article, nav)
    - Add ARIA labels for interactive elements (filter buttons, refresh button, project cards)
    - Add ARIA attributes for progress bars (aria-valuenow, aria-valuemin, aria-valuemax)
    - Ensure keyboard navigation works for all interactive elements
    - Maintain sufficient color contrast ratios
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.3 Write unit tests for accessibility
    - Test ARIA labels are present
    - Test keyboard navigation works
    - Test semantic HTML structure

- [ ] 10. Add loading states and performance optimizations
  - [ ] 10.1 Implement loading indicators
    - Show loading spinner while fetching statistics
    - Show loading skeleton for project cards
    - Display timeout message if loading takes longer than 10 seconds
    - _Requirements: 2.8, 3.10, 9.1, 9.8_

  - [ ] 10.2 Optimize data fetching performance
    - Ensure statistics and project list load in parallel
    - Memoize statistics calculations to avoid recomputation
    - Memoize filtered project lists
    - Consider using React.memo for sub-components
    - _Requirements: 9.2_

  - [ ]* 10.3 Write unit tests for loading states
    - Test loading indicators display correctly
    - Test timeout message appears after 10 seconds
    - Test empty states display correctly

- [ ] 11. Final checkpoint - Integration and testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Wire everything together and verify end-to-end flow
  - [ ] 12.1 Integrate all components in Transparencia.jsx
    - Wire TransparenciaStats, TransparenciaFilters, and TransparenciaProjectList together
    - Ensure filter state updates project list correctly
    - Ensure refresh button clears cache and reloads all data
    - Verify error states display correctly
    - _Requirements: All requirements_

  - [ ]* 12.2 Write integration tests
    - Test complete user flow: navigate to page → see stats → filter projects → refresh data
    - Test error scenarios: network failure, contract error, invalid data
    - Test caching behavior: data served from cache, cache expiration, manual refresh

  - [ ]* 12.3 Write property test for real-time blockchain data
    - **Property 8: Real-time blockchain data**
    - **Validates: Requirements 6.4**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The Transparencia.jsx component already exists but is incomplete - tasks will complete it
- All styling should reuse existing CSS classes from index.css
- All contract calls should use existing functions from contrato.js without modification
