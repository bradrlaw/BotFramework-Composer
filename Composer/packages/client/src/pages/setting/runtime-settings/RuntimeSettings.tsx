// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import { useState, Fragment, useEffect } from 'react';
import formatMessage from 'format-message';
import { Toggle } from 'office-ui-fabric-react/lib/Toggle';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Link } from 'office-ui-fabric-react/lib/Link';
import { RouteComponentProps } from '@reach/router';
import { useRecoilValue } from 'recoil';
import { Spinner } from 'office-ui-fabric-react/lib/Spinner';

import {
  botNameState,
  settingsState,
  projectIdState,
  dispatcherState,
  ejectRuntimeSelector,
  boilerplateVersionState,
} from '../../../recoilModel';
import { OpenConfirmModal } from '../../../components/Modal/ConfirmDialog';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

import { EjectModal } from './ejectModal';
import { WorkingModal } from './workingModal';
import { breathingSpace, runtimeSettingsStyle, runtimeControls, runtimeToggle, controlGroup } from './style';

export const RuntimeSettings: React.FC<RouteComponentProps> = () => {
  const botName = useRecoilValue(botNameState);
  const settings = useRecoilValue(settingsState);
  const projectId = useRecoilValue(projectIdState);
  const boilerplateVersion = useRecoilValue(boilerplateVersionState);

  const { setCustomRuntime, setRuntimeField, getBoilerplateVersion, updateBoilerplate } = useRecoilValue(
    dispatcherState
  );
  const runtimeEjection = useRecoilValue(ejectRuntimeSelector);

  const [formDataErrors, setFormDataErrors] = useState({ command: '', path: '' });
  const [ejectModalVisible, setEjectModalVisible] = useState(false);
  const [working, setWorking] = useState(false);
  const [ejecting, setEjecting] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    // check the status of the boilerplate material and see if it requires an update
    getBoilerplateVersion(projectId);
  }, []);

  useEffect(() => {
    setNeedsUpdate(boilerplateVersion.updateRequired || false);
  }, [boilerplateVersion.updateRequired]);

  const handleChangeToggle = (_, isOn = false) => {
    setCustomRuntime(projectId, isOn);
  };

  const updateSetting = (field) => (e, newValue) => {
    let valid = true;
    let error = 'There was an error';
    if (newValue === '') {
      valid = false;
      error = 'This is a required field.';
    }

    setRuntimeField(projectId, field, newValue);

    if (valid) {
      setFormDataErrors({ ...formDataErrors, [field]: '' });
    } else {
      setFormDataErrors({ ...formDataErrors, [field]: error });
    }
  };

  const header = () => (
    <div css={runtimeControls}>
      <p>{formatMessage('Configure Composer to start your bot using runtime code you can customize and control.')}</p>
    </div>
  );

  const toggle = () => (
    <div css={runtimeToggle}>
      <Toggle
        inlineLabel
        checked={settings.runtime?.customRuntime}
        label={formatMessage('Use custom runtime')}
        onChange={handleChangeToggle}
      />
    </div>
  );

  const showEjectModal = () => {
    setEjectModalVisible(true);
  };
  const closeEjectModal = () => {
    setEjectModalVisible(false);
  };

  const callEjectRuntime = async (templateKey: string) => {
    setEjecting(true);
    closeEjectModal();
    await runtimeEjection?.onAction(projectId, templateKey);
    setEjecting(false);
  };

  const callUpdateBoilerplate = async () => {
    const title = formatMessage('Update Scripts');
    const msg = formatMessage(
      'Existing files in scripts/ folder will be overwritten. Are you sure you want to continue?'
    );
    const res = await OpenConfirmModal(title, msg);
    if (res) {
      setWorking(true);
      await updateBoilerplate(projectId);
      // add a slight delay, so the working indicator is visible for a moment at least!
      await new Promise((resolve) => {
        setTimeout(() => {
          setWorking(false);
          resolve();
        }, 500);
      });
    }
  };

  return botName ? (
    <div css={runtimeSettingsStyle}>
      {header()}
      {toggle()}
      <div css={controlGroup}>
        <TextField
          required
          data-testid="runtimeCodeLocation"
          disabled={!settings.runtime || !settings.runtime.customRuntime}
          errorMessage={formDataErrors.path}
          label={formatMessage('Runtime code location')}
          styles={name}
          value={settings.runtime ? settings.runtime.path : ''}
          onChange={updateSetting('path')}
        />
        {formatMessage('Or: ')}
        <Link
          css={breathingSpace}
          disabled={!settings.runtime || !settings.runtime.customRuntime}
          onClick={showEjectModal}
        >
          {formatMessage('Get a new copy of the runtime code')}
        </Link>

        <TextField
          required
          data-testid="runtimeCommand"
          disabled={!settings.runtime || !settings.runtime.customRuntime}
          errorMessage={formDataErrors.command}
          label={formatMessage('Start command')}
          styles={name}
          value={settings.runtime ? settings.runtime.command : ''}
          onChange={updateSetting('command')}
        />
      </div>
      <br />
      {needsUpdate && (
        <div css={controlGroup}>
          <p>
            {formatMessage(
              'A newer version of the provisioning scripts has been found, and this project can be updated to the latest.'
            )}
          </p>
          <DefaultButton disabled={working} onClick={callUpdateBoilerplate}>
            {working && (
              <Fragment>
                <Spinner />
                &nbsp;
                {formatMessage('Updating scripts... ')}
              </Fragment>
            )}
            {!working && <Fragment>{formatMessage('Update scripts')}</Fragment>}
          </DefaultButton>
        </div>
      )}
      <WorkingModal hidden={!ejecting} title={formatMessage('Ejecting runtime...')} />
      <EjectModal closeModal={closeEjectModal} ejectRuntime={callEjectRuntime} hidden={!ejectModalVisible} />
    </div>
  ) : (
    <LoadingSpinner />
  );
};
