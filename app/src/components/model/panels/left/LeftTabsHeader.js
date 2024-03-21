import { AppBar, Grow, Tab, Tabs } from "@mui/material";
import { TAB } from "./constants";
import { useSelectedComponent } from "../../hooks/useSelectedComponent";

export function LeftTabsHeader({ tab, setTab }) {
  const selected = useSelectedComponent();

  return (
    <AppBar position="static">
      <Grow in={true}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="inherit"
          variant="fullWidth"
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: (theme) => theme.palette.common.gramPink,
            },
          }}
        >
          <Tab disableRipple label="SYSTEM" value={TAB.SYSTEM} />
          <Tab disableRipple label="ACTION ITEMS" value={TAB.ACTION_ITEMS} />
          {selected && (
            <Tab disableRipple label="COMPONENT" value={TAB.COMPONENT} />
          )}
        </Tabs>
      </Grow>
    </AppBar>
  );
}
