import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import {
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    Sequelize,
    ModelStatic,
} from 'sequelize';
import {Example} from './Example';
import {User} from '../../../dist';
import {JsonSchema} from './JsonSchema';

@Table({tableName: 'test', timestamps: true})
export class Test extends Model<
    InferAttributes<Test>,
    InferCreationAttributes<Test>
> {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @Column({type: DataType.STRING, allowNull: false})
    declare title: string;

    @Column(DataType.JSON)
    declare mediamanager: object

    // ——————————————————————————————————————————————
    // Example (1-to-1)
    // ——————————————————————————————————————————————
    @ForeignKey(() => Example)
    @Column({type: DataType.INTEGER, allowNull: true})
    declare exampleId: number;

    @BelongsTo(() => Example, {foreignKey: 'exampleId', as: 'example'})
    declare example: Example;

    @ForeignKey(() => JsonSchema)
    @Column({type: DataType.INTEGER, allowNull: true})
    declare schemaId: number;

    @BelongsTo(() => JsonSchema, {foreignKey: 'schemaId', as: 'schema'})
    declare schema: JsonSchema;

    // ——————————————————————————————————————————————
    // Owner (1-to-1 with UserAP host model at runtime)
    // ——————————————————————————————————————————————
    @Column({type: DataType.INTEGER, allowNull: true})
    declare ownerId: number;
    declare owner?: User;

    // ——————————————————————————————————————————————
    // Many-to-many with UserAP host model via `test_useraps`
    // ——————————————————————————————————————————————
    declare userAPs?: User[];

    static associate(sequelize: Sequelize) {
        const UserAPModel = sequelize.model('UserAP') as ModelStatic<Model<User>>;
        // 1-to-1: ownerId -> one UserAP host model
        this.belongsTo(UserAPModel, {
            foreignKey: 'ownerId',
            as: 'owner',
        });

        // M-to-N: via the test_useraps table
        this.belongsToMany(UserAPModel, {
            through: 'test_useraps',
            foreignKey: 'testId',
            otherKey: 'userAPId',
            as: 'userAPs',
        });
    }
}
  
