import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';

function SubNav() {
  const { id } = useParams();
  const { t } = useTranslation();

  const activeLinkStyle = {
    backgroundColor: '#319795', // teal.500
    color: 'white',
  };

  return (
    <Box display="flex" justifyContent="center" my={6}>
      <ButtonGroup isAttached variant="outline">
        <NavLink to={`/nuzlocke/${id}`} end style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}>
          <Button borderRightRadius={0}>{t('subnav.encounters')}</Button>
        </NavLink>
        <NavLink to={`/nuzlocke/${id}/teambuilder`} style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}>
          <Button borderRadius={0}>{t('subnav.teambuilder')}</Button>
        </NavLink>
        <Tooltip label="Demnächst verfügbar" hasArrow>
            <Button borderLeftRadius={0} isDisabled>
                {t('subnav.statistics')}
            </Button>
        </Tooltip>
      </ButtonGroup>
    </Box>
  );
}

export default SubNav;