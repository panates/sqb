import {Column, Entity, PrimaryKey} from '@sqb/connect';

@Entity({tableName: 'tags'})
export class Tag {
    @PrimaryKey()
    @Column({autoGenerated: 'increment'})
    id: number;

    @Column()
    name: string;

    @Column({default: true})
    active: boolean = true;

    @Column({
        enum: ['red', 'green', 'blue', 'yellow', 'brown', 'white'],
        default: (obj) => {
            if (obj.tag === 'small')
                return 'yellow'
            if (obj.tag === 'generous')
                return 'green'
            if (obj.tag === 'large')
                return 'orange'
            if (obj.tag === 'stingy')
                return 'red'
        }
    })
    color: string;
}