import { EventEmitter, window } from 'vscode';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';
import { EnvironmentPickItem } from '../models/environmentPickItem';
import { trace } from "../utils/decorator";
import { EnvironmentStatusEntry } from '../utils/environmentStatusBarEntry';
import { PersistUtility } from '../utils/persistUtility';

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = {
        label: 'No Environment',
        name: Constants.NoEnvironmentSelectedName,
        description: 'You can still use variables defined in the $shared environment'
    };

    public static readonly sharedEnvironmentName: string = '$shared';

    private static readonly _onDidChangeEnvironment = new EventEmitter<string>();

    public static readonly onDidChangeEnvironment = EnvironmentController._onDidChangeEnvironment.event;

    private readonly settings: RestClientSettings = RestClientSettings.Instance;

    private environmentStatusEntry: EnvironmentStatusEntry;

    private currentEnvironment: EnvironmentPickItem;

    private constructor(initEnvironment: EnvironmentPickItem) {
        this.currentEnvironment = initEnvironment;
        this.environmentStatusEntry = new EnvironmentStatusEntry(initEnvironment.label);
    }

    @trace('Switch Environment')
    public async switchEnvironment() {
        // Add no environment at the top
        const userEnvironments: EnvironmentPickItem[] =
            Object.keys(this.settings.environmentVariables)
                .filter(name => name !== EnvironmentController.sharedEnvironmentName)
                .map(name => ({
                    name,
                    label: name,
                    description: name === this.currentEnvironment.name ? '$(check)' : undefined
                }));

        const itemPickList: EnvironmentPickItem[] = [EnvironmentController.noEnvironmentPickItem, ...userEnvironments];
        const item = await window.showQuickPick(itemPickList, { placeHolder: "Select REST Client Environment" });
        if (!item) {
            return;
        }

        this.currentEnvironment = item;

        EnvironmentController._onDidChangeEnvironment.fire(item.label);
        this.environmentStatusEntry.update(item.label);

        await PersistUtility.saveEnvironment(item);
    }

    public static async create(): Promise<EnvironmentController> {
        const environment = await this.getCurrentEnvironment();
        return new EnvironmentController(environment);
    }

    public static async getCurrentEnvironment(): Promise<EnvironmentPickItem> {
        let currentEnvironment = await PersistUtility.loadEnvironment();
        if (!currentEnvironment) {
            currentEnvironment = this.noEnvironmentPickItem;
            await PersistUtility.saveEnvironment(currentEnvironment);
        }
        return currentEnvironment;
    }

    public dispose() {
        this.environmentStatusEntry.dispose();
    }
}