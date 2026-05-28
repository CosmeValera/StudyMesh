import { useMediaQuery, useTheme } from '@mui/material'

export const useResponsiveWorkspaceMode = () => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))
  const isPhoneOrTablet = useMediaQuery(theme.breakpoints.down('lg'))
  const isDesktopWorkspace = useMediaQuery(theme.breakpoints.up('lg'))

  return {
    theme,
    isPhone,
    isTablet,
    isPhoneOrTablet,
    isDesktopWorkspace,
  }
}
