import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';

import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';

import NotificationsIcon from '@material-ui/icons/Notifications';
import NotificationsPausedIcon from '@material-ui/icons/NotificationsPaused';
import SettingsIcon from '@material-ui/icons/Settings';

import { sortableContainer, sortableElement } from 'react-sortable-hoc';

import connectComponent from '../../helpers/connect-component';
import getWorkspacesAsList from '../../helpers/get-workspaces-as-list';

import WorkspaceSelector from './workspace-selector';
import FindInPage from './find-in-page';
import NavigationBar from './navigation-bar';
import FakeTitleBar from './fake-title-bar';
import DraggableRegion from './draggable-region';

import {
  requestCreateWorkspace,
  requestHibernateWorkspace,
  requestRemoveWorkspace,
  requestSetActiveWorkspace,
  requestSetWorkspaces,
  requestShowEditWorkspaceWindow,
  requestShowNotificationsWindow,
  requestShowPreferencesWindow,
  requestWakeUpWorkspace,
} from '../../senders';


// https://github.com/sindresorhus/array-move/blob/master/index.js
const arrayMove = (array, from, to) => {
  const newArray = array.slice();
  const startIndex = to < 0 ? newArray.length + to : to;
  const item = newArray.splice(from, 1)[0];
  newArray.splice(startIndex, 0, item);
  return newArray;
};

const styles = (theme) => ({
  outerRoot: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  root: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    height: '100%',
    width: '100%',
  },
  sidebarRoot: {
    height: '100%',
    width: 68,
    borderRight: '1px solid rgba(0, 0, 0, 0.2)',
    backgroundColor: theme.palette.background.paper,
    WebkitAppRegion: 'drag',
    WebkitUserSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: theme.spacing(1),
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  sidebarTop: {
    flex: 1,
    paddingTop: window.process.platform === 'darwin' ? theme.spacing(3) : 0,
  },
  sidebarTopFullScreen: {
    paddingTop: 0,
  },
  innerContentRoot: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1),
  },
  contentRoot: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  grabbing: {
    cursor: 'grabbing !important',
    pointerEvents: 'auto !important',
  },
  end: {
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    color: theme.palette.text.disabled,
  },
});

const SortableItem = sortableElement(({ value }) => {
  const { workspace, index } = value;
  const {
    active, id, name, badgeCount, picturePath, hibernated, transparentBackground,
  } = workspace;
  return (
    <WorkspaceSelector
      active={active}
      id={id}
      key={id}
      name={name}
      badgeCount={badgeCount}
      picturePath={picturePath}
      transparentBackground={transparentBackground}
      order={index}
      hibernated={hibernated}
      onClick={() => requestSetActiveWorkspace(id)}
      onContextMenu={(e) => {
        e.preventDefault();

        const template = [
          {
            label: 'Edit Workspace',
            click: () => requestShowEditWorkspaceWindow(id),
          },
          {
            label: 'Remove Workspace',
            click: () => requestRemoveWorkspace(id),
          },
        ];

        if (!active) {
          template.splice(1, 0, {
            label: hibernated ? 'Wake Up Workspace' : 'Hibernate Workspace',
            click: () => {
              if (hibernated) {
                return requestWakeUpWorkspace(id);
              }
              return requestHibernateWorkspace(id);
            },
          });
        }

        const { remote } = window.require('electron');
        const menu = remote.Menu.buildFromTemplate(template);
        menu.popup(remote.getCurrentWindow());
      }}
    />
  );
});

const SortableContainer = sortableContainer(({ children }) => <div>{children}</div>);

const SidebarContainer = ({ className, children }) => {
  // use native scroll bar on macOS
  if (window.process.platform === 'darwin') {
    return <div className={className}>{children}</div>;
  }
  return <SimpleBar className={className}>{children}</SimpleBar>;
};
SidebarContainer.propTypes = {
  className: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const Main = ({
  classes,
  didFailLoad,
  isFullScreen,
  isLoading,
  navigationBar,
  shouldPauseNotifications,
  sidebar,
  titleBar,
  workspaces,
}) => {
  const workspacesList = getWorkspacesAsList(workspaces);
  const showTitleBar = window.process.platform === 'darwin' && titleBar;

  return (
    <div className={classes.outerRoot}>
      {showTitleBar && (<FakeTitleBar />)}
      {<DraggableRegion />}
      <div className={classes.root}>
        {sidebar && (
          <SidebarContainer className={classes.sidebarRoot}>
            <div className={classNames(classes.sidebarTop,
              (isFullScreen || showTitleBar || window.mode === 'menubar') && classes.sidebarTopFullScreen)}
            >
              <SortableContainer
                distance={10}
                helperClass={classes.grabbing}
                onSortEnd={({ oldIndex, newIndex }) => {
                  if (oldIndex === newIndex) return;

                  const newWorkspacesList = arrayMove(workspacesList, oldIndex, newIndex);
                  const newWorkspaces = { ...workspaces };
                  newWorkspacesList.forEach((workspace, i) => {
                    newWorkspaces[workspace.id].order = i;
                  });

                  requestSetWorkspaces(newWorkspaces);
                }}
              >
                {workspacesList.map((workspace, i) => (
                  <SortableItem key={`item-${workspace.id}`} index={i} value={{ index: i, workspace }} />
                ))}
              </SortableContainer>
              <WorkspaceSelector id="add" onClick={requestCreateWorkspace} />
            </div>
            {!navigationBar && (
            <div className={classes.end}>
              <IconButton aria-label="Notifications" onClick={requestShowNotificationsWindow} className={classes.iconButton}>
                {shouldPauseNotifications ? <NotificationsPausedIcon /> : <NotificationsIcon />}
              </IconButton>
              {window.mode === 'menubar' && (
                <IconButton aria-label="Preferences" onClick={() => requestShowPreferencesWindow()} className={classes.iconButton}>
                  <SettingsIcon />
                </IconButton>
              )}
            </div>
            )}
          </SidebarContainer>
        )}
        <div className={classes.contentRoot}>
          {navigationBar && <NavigationBar />}
          <FindInPage />
          <div className={classes.innerContentRoot}>
            {didFailLoad && !isLoading && (
              <div>
                <Typography align="center" variant="h6">
                  This site can’t be reached.
                </Typography>

                <Typography align="center" variant="body2">
                  Try:
                  - Checking the network cables, modem, and router.
                  - Checking the proxy and the firewall.
                  - Reconnecting to Wi-Fi.
                </Typography>

                <Typography align="center" variant="body2">
                  Press ⌘ + R to reload.
                </Typography>
              </div>
            )}
            {isLoading && (
              <Typography align="center" variant="body2" className={classes.loading}>
                Loading...
              </Typography>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Main.propTypes = {
  classes: PropTypes.object.isRequired,
  didFailLoad: PropTypes.bool.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  navigationBar: PropTypes.bool.isRequired,
  shouldPauseNotifications: PropTypes.bool.isRequired,
  sidebar: PropTypes.bool.isRequired,
  titleBar: PropTypes.bool.isRequired,
  workspaces: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  didFailLoad: state.general.didFailLoad,
  isFullScreen: state.general.isFullScreen,
  isLoading: state.general.isLoading,
  navigationBar: (window.process.platform === 'linux'
    && state.preferences.attachToMenubar
    && !state.preferences.sidebar)
    || state.preferences.navigationBar,
  shouldPauseNotifications: state.notifications.pauseNotificationsInfo !== null,
  sidebar: state.preferences.sidebar,
  titleBar: state.preferences.titleBar,
  workspaces: state.workspaces,
});

export default connectComponent(
  Main,
  mapStateToProps,
  null,
  styles,
);
